import { prisma } from '../config/database';
import { MonitorStatus, IncidentStatus } from '@devpulse/shared';

export class AnalyticsService {
  static async getOverview(teamId: string) {
    const monitors = await prisma.monitor.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        url: true,
        currentStatus: true,
        uptimePercentage: true,
        lastCheckedAt: true,
      },
    });

    const totalMonitors = monitors.length;
    const operationalServices = monitors.filter((m) => m.currentStatus === MonitorStatus.UP).length;
    const downServices = monitors.filter((m) => m.currentStatus === MonitorStatus.DOWN).length;

    // Overall uptime percentage across all monitors
    const overallUptimePercentage =
      totalMonitors > 0
        ? Number(
            (monitors.reduce((acc, m) => acc + m.uptimePercentage, 0) / totalMonitors).toFixed(2)
          )
        : 100.0;

    // 24h checks metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const monitorIds = monitors.map((m) => m.id);

    const checks24h = await prisma.monitorCheck.findMany({
      where: {
        monitorId: { in: monitorIds },
        checkedAt: { gte: oneDayAgo },
      },
      select: {
        responseTimeMs: true,
        isSuccess: true,
        checkedAt: true,
      },
      orderBy: { checkedAt: 'asc' },
    });

    const totalChecks24h = checks24h.length;
    const successfulChecks24h = checks24h.filter((c) => c.isSuccess).length;
    const failedChecks24h = totalChecks24h - successfulChecks24h;

    const latencies = checks24h
      .map((c) => c.responseTimeMs)
      .filter((l): l is number => typeof l === 'number' && l > 0);
    const averageResponseTimeMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    // Incidents
    const incidents = await prisma.incident.findMany({
      where: {
        monitor: { teamId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        monitor: {
          select: { name: true, url: true },
        },
      },
    });

    const totalIncidents = await prisma.incident.count({
      where: { monitor: { teamId } },
    });

    const activeIncidents = await prisma.incident.count({
      where: {
        monitor: { teamId },
        status: { in: [IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED, IncidentStatus.MONITORING] },
      },
    });

    // Response time trend (sampled data points from checks)
    // Group into 12 buckets or take last 20 points
    const responseTimeTrends = checks24h
      .filter((c) => c.responseTimeMs && c.responseTimeMs > 0)
      .slice(-30)
      .map((c) => ({
        timestamp: c.checkedAt.toISOString(),
        responseTimeMs: c.responseTimeMs,
      }));

    return {
      totalMonitors,
      operationalServices,
      downServices,
      overallUptimePercentage,
      averageResponseTimeMs,
      totalIncidents,
      activeIncidents,
      totalChecks24h,
      successfulChecks24h,
      failedChecks24h,
      recentIncidents: incidents.map((inc) => ({
        id: inc.id,
        title: inc.title,
        monitorName: inc.monitor.name,
        failureReason: inc.failureReason,
        status: inc.status,
        startedAt: inc.startedAt,
        resolvedAt: inc.resolvedAt,
        durationSeconds: inc.durationSeconds,
      })),
      responseTimeTrends,
    };
  }

  static async getUptimeStats(teamId: string) {
    const monitors = await prisma.monitor.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        url: true,
        currentStatus: true,
        uptimePercentage: true,
      },
    });

    const now = new Date();
    const periods = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const monitorStats = await Promise.all(
      monitors.map(async (mon) => {
        const [checks24h, checks7d, checks30d] = await Promise.all([
          prisma.monitorCheck.findMany({
            where: { monitorId: mon.id, checkedAt: { gte: periods['24h'] } },
            select: { isSuccess: true },
          }),
          prisma.monitorCheck.findMany({
            where: { monitorId: mon.id, checkedAt: { gte: periods['7d'] } },
            select: { isSuccess: true },
          }),
          prisma.monitorCheck.findMany({
            where: { monitorId: mon.id, checkedAt: { gte: periods['30d'] } },
            select: { isSuccess: true },
          }),
        ]);

        const calcRatio = (checks: { isSuccess: boolean }[]) =>
          checks.length > 0
            ? Number(((checks.filter((c) => c.isSuccess).length / checks.length) * 100).toFixed(2))
            : 100.0;

        return {
          id: mon.id,
          name: mon.name,
          currentStatus: mon.currentStatus,
          uptime24h: calcRatio(checks24h),
          uptime7d: calcRatio(checks7d),
          uptime30d: calcRatio(checks30d),
        };
      })
    );

    return monitorStats;
  }
}
