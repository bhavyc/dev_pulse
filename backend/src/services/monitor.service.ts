import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { MonitorStatus, HttpMethod } from '@devpulse/shared';

export class MonitorService {
  static async listMonitors(teamId: string) {
    return prisma.monitor.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        checks: {
          take: 10,
          orderBy: { checkedAt: 'desc' },
          select: {
            id: true,
            statusCode: true,
            responseTimeMs: true,
            isSuccess: true,
            checkedAt: true,
          },
        },
      },
    });
  }

  static async getMonitorById(monitorId: string, teamId: string) {
    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId, teamId },
      include: {
        checks: {
          take: 50,
          orderBy: { checkedAt: 'desc' },
        },
        incidents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            updates: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404, 'NOT_FOUND');
    }

    // Compute 24-hour uptime and latency aggregates from DB checks
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const checks24h = await prisma.monitorCheck.findMany({
      where: {
        monitorId,
        checkedAt: { gte: oneDayAgo },
      },
      select: {
        isSuccess: true,
        responseTimeMs: true,
      },
    });

    const totalChecks = checks24h.length;
    const successfulChecks = checks24h.filter((c) => c.isSuccess).length;
    const uptime24h =
      totalChecks > 0 ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100.0;

    const validLatencies = checks24h
      .map((c) => c.responseTimeMs)
      .filter((l): l is number => typeof l === 'number' && l > 0);
    const avgLatency24h =
      validLatencies.length > 0
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : 0;

    return {
      ...monitor,
      stats: {
        uptime24h,
        avgLatency24h,
        totalChecks24h: totalChecks,
        successfulChecks24h: successfulChecks,
      },
    };
  }

  static async createMonitor(
    teamId: string,
    data: {
      name: string;
      url: string;
      httpMethod?: HttpMethod;
      checkIntervalSeconds?: number;
      timeoutSeconds?: number;
      expectedStatusCodes?: number[];
      requestHeaders?: Record<string, string> | null;
      requestBody?: string | null;
      isActive?: boolean;
    }
  ) {
    return prisma.monitor.create({
      data: {
        teamId,
        name: data.name,
        url: data.url,
        httpMethod: data.httpMethod || HttpMethod.GET,
        checkIntervalSeconds: data.checkIntervalSeconds || 300,
        timeoutSeconds: data.timeoutSeconds || 10,
        expectedStatusCodes: data.expectedStatusCodes || [200],
        requestHeaders: data.requestHeaders ? JSON.parse(JSON.stringify(data.requestHeaders)) : undefined,
        requestBody: data.requestBody,
        isActive: data.isActive !== undefined ? data.isActive : true,
        currentStatus: MonitorStatus.PENDING,
      },
    });
  }

  static async updateMonitor(
    monitorId: string,
    teamId: string,
    data: Partial<{
      name: string;
      url: string;
      httpMethod: string;
      checkIntervalSeconds: number;
      timeoutSeconds: number;
      expectedStatusCodes: number[];
      requestHeaders: Record<string, string> | null;
      requestBody: string | null;
      isActive: boolean;
      isPaused: boolean;
    }>
  ) {
    const existing = await prisma.monitor.findFirst({
      where: { id: monitorId, teamId },
    });

    if (!existing) {
      throw new AppError('Monitor not found', 404, 'NOT_FOUND');
    }

    return prisma.monitor.update({
      where: { id: monitorId },
      data: {
        ...data,
        requestHeaders: data.requestHeaders !== undefined ? (data.requestHeaders ? JSON.parse(JSON.stringify(data.requestHeaders)) : null) : undefined,
      },
    });
  }

  static async deleteMonitor(monitorId: string, teamId: string) {
    const existing = await prisma.monitor.findFirst({
      where: { id: monitorId, teamId },
    });

    if (!existing) {
      throw new AppError('Monitor not found', 404, 'NOT_FOUND');
    }

    await prisma.monitor.delete({
      where: { id: monitorId },
    });

    return { success: true };
  }

  static async pauseMonitor(monitorId: string, teamId: string) {
    return this.updateMonitor(monitorId, teamId, { isPaused: true });
  }

  static async resumeMonitor(monitorId: string, teamId: string) {
    return this.updateMonitor(monitorId, teamId, { isPaused: false });
  }

  static async getMonitorChecks(
    monitorId: string,
    teamId: string,
    page = 1,
    limit = 30
  ) {
    const existing = await prisma.monitor.findFirst({
      where: { id: monitorId, teamId },
    });

    if (!existing) {
      throw new AppError('Monitor not found', 404, 'NOT_FOUND');
    }

    const skip = (page - 1) * limit;

    const [checks, total] = await Promise.all([
      prisma.monitorCheck.findMany({
        where: { monitorId },
        orderBy: { checkedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.monitorCheck.count({ where: { monitorId } }),
    ]);

    return {
      checks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
