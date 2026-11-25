import { prisma } from '../config/database';
import { Prober, ProbeResult } from './prober';
import { WorkerPool } from './worker-pool';
import { EmailService } from '../services/email.service';
import { WebhookService } from '../services/webhook.service';
import { MonitorStatus, IncidentStatus, AlertType, AlertChannelType } from '@devpulse/shared';
import { logger } from '../utils/logger';

export class MonitoringScheduler {
  private static intervalHandle: NodeJS.Timeout | null = null;
  private static workerPool = new WorkerPool(10);
  private static isTicking = false;
  // Alert cooldown map: monitorId -> last alert timestamp (prevent alert storms)
  private static alertCooldowns: Map<string, number> = new Map();
  private static readonly COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

  static start(tickIntervalMs = 30000) {
    if (this.intervalHandle) return;

    logger.info(`⚡ Autonomous Monitoring Scheduler started (tick every ${tickIntervalMs / 1000}s)`);

    this.tick();

    this.intervalHandle = setInterval(() => {
      this.tick();
    }, tickIntervalMs);
  }

  static stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('🛑 Monitoring Scheduler stopped.');
    }
  }

  static async tick() {
    if (this.isTicking) return;
    this.isTicking = true;

    try {
      const now = new Date();

      const activeMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          isPaused: false,
        },
      });

      const dueMonitors = activeMonitors.filter((m) => {
        if (!m.lastCheckedAt) return true;
        const nextRun = new Date(m.lastCheckedAt.getTime() + m.checkIntervalSeconds * 1000);
        return now >= nextRun;
      });

      if (dueMonitors.length > 0) {
        logger.info(`🔍 Scheduler tick: ${dueMonitors.length} due monitors found.`);
      }

      for (const monitor of dueMonitors) {
        if (!this.workerPool.isMonitorRunning(monitor.id)) {
          this.workerPool.runTask(monitor.id, () => this.processMonitor(monitor));
        }
      }
    } catch (error) {
      logger.error('Error during scheduler tick:', error);
    } finally {
      this.isTicking = false;
    }
  }

  static async processMonitor(monitor: any) {
    const startTime = new Date();

    const result: ProbeResult = await Prober.executeProbe({
      url: monitor.url,
      httpMethod: monitor.httpMethod,
      timeoutSeconds: monitor.timeoutSeconds,
      expectedStatusCodes: monitor.expectedStatusCodes,
      requestHeaders: monitor.requestHeaders as Record<string, string>,
      requestBody: monitor.requestBody,
    });

    await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        isSuccess: result.isSuccess,
        errorMessage: result.errorMessage,
        timingDetails: result.timingDetails,
        checkedAt: startTime,
      },
    });

    let consecutiveFailures = monitor.consecutiveFailures;
    let newStatus = monitor.currentStatus;

    if (!result.isSuccess) {
      consecutiveFailures += 1;

      if (consecutiveFailures >= 2 && monitor.currentStatus !== MonitorStatus.DOWN) {
        newStatus = MonitorStatus.DOWN;
        await this.handleServiceDown(monitor, result);
      }
    } else {
      if (monitor.currentStatus === MonitorStatus.DOWN) {
        newStatus = MonitorStatus.UP;
        await this.handleServiceRecovery(monitor, result);
      }
      consecutiveFailures = 0;
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const checks24h = await prisma.monitorCheck.findMany({
      where: {
        monitorId: monitor.id,
        checkedAt: { gte: oneDayAgo },
      },
      select: { isSuccess: true },
    });

    const totalChecks = checks24h.length;
    const successfulChecks = checks24h.filter((c) => c.isSuccess).length;
    const uptimePercentage =
      totalChecks > 0 ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100.0;

    await prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        lastCheckedAt: startTime,
        currentStatus: newStatus,
        consecutiveFailures,
        uptimePercentage,
        sslDetails: result.sslDetails ? JSON.parse(JSON.stringify(result.sslDetails)) : undefined,
      },
    });
  }

  private static async handleServiceDown(monitor: any, result: ProbeResult) {
    logger.warn(`🚨 Monitor DOWN: ${monitor.name} (${monitor.url}) - ${result.errorMessage}`);

    const existingIncident = await prisma.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: [IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED, IncidentStatus.MONITORING] },
      },
    });

    let incidentId = existingIncident?.id;

    if (!existingIncident) {
      const incident = await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          title: `Service Outage: ${monitor.name}`,
          failureReason: result.errorMessage || 'Target endpoint failed health checks',
          status: IncidentStatus.INVESTIGATING,
          startedAt: new Date(),
        },
      });

      incidentId = incident.id;

      await prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          status: IncidentStatus.INVESTIGATING,
          message: `Automated alert: Service is unreachable or returning unexpected status. Failure: ${result.errorMessage}`,
        },
      });
    }

    // Check alert cooldown
    const lastAlert = this.alertCooldowns.get(monitor.id) || 0;
    const now = Date.now();

    if (now - lastAlert >= this.COOLDOWN_MS && incidentId) {
      this.alertCooldowns.set(monitor.id, now);
      await this.dispatchAlertNotifications(monitor, incidentId, AlertType.DOWN, result.errorMessage || 'Unknown error');
    } else {
      logger.info(`[ALERT COOLDOWN] Alert for ${monitor.name} suppressed due to 30m cooldown.`);
    }
  }

  private static async handleServiceRecovery(monitor: any, result: ProbeResult) {
    logger.info(`✅ Monitor RECOVERED: ${monitor.name} (${monitor.url})`);

    // Reset cooldown on recovery
    this.alertCooldowns.delete(monitor.id);

    const activeIncident = await prisma.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: [IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED, IncidentStatus.MONITORING] },
      },
    });

    if (activeIncident) {
      const resolvedAt = new Date();
      const durationSeconds = Math.round(
        (resolvedAt.getTime() - activeIncident.startedAt.getTime()) / 1000
      );

      await prisma.incident.update({
        where: { id: activeIncident.id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt,
          durationSeconds,
        },
      });

      await prisma.incidentUpdate.create({
        data: {
          incidentId: activeIncident.id,
          status: IncidentStatus.RESOLVED,
          message: `Service has fully recovered and is passing all health checks with response time ${result.responseTimeMs}ms.`,
        },
      });

      await this.dispatchAlertNotifications(
        monitor,
        activeIncident.id,
        AlertType.RECOVERY,
        `Service recovered after ${Math.floor(durationSeconds / 60)} minutes`,
        durationSeconds
      );
    }
  }

  private static async dispatchAlertNotifications(
    monitor: any,
    incidentId: string,
    type: AlertType,
    details: string,
    durationSeconds?: number | null
  ) {
    try {
      const channels = await prisma.notificationChannel.findMany({
        where: { teamId: monitor.teamId, isEnabled: true },
      });

      for (const channel of channels) {
        if (
          (type === AlertType.DOWN && channel.notifyOnDown) ||
          (type === AlertType.RECOVERY && channel.notifyOnRecovery)
        ) {
          let sent = false;
          if (channel.type === AlertChannelType.DISCORD_WEBHOOK) {
            sent = await WebhookService.sendDiscordAlert(
              channel.destination,
              type === AlertType.DOWN,
              monitor.name,
              monitor.url,
              details,
              durationSeconds
            );
          } else if (channel.type === AlertChannelType.SLACK_WEBHOOK) {
            sent = await WebhookService.sendSlackAlert(
              channel.destination,
              type === AlertType.DOWN,
              monitor.name,
              monitor.url,
              details
            );
          } else {
            if (type === AlertType.DOWN) {
              sent = await EmailService.sendDownAlert(channel.destination, monitor.name, monitor.url, details);
            } else {
              sent = await EmailService.sendRecoveryAlert(channel.destination, monitor.name, monitor.url, durationSeconds);
            }
          }

          await prisma.alertLog.create({
            data: {
              incidentId,
              channelId: channel.id,
              alertType: type,
              recipient: channel.destination,
              status: sent ? 'SENT' : 'FAILED',
              errorMessage: sent ? null : 'Email delivery failed',
            },
          });
        }
      }
    } catch (err) {
      logger.error('Failed to dispatch alert notifications:', err);
    }
  }
}
