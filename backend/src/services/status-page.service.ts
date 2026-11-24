import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { MonitorStatus, IncidentStatus } from '@devpulse/shared';

export class StatusPageService {
  static async listStatusPages(teamId: string) {
    return prisma.statusPage.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        monitors: {
          include: {
            monitor: {
              select: { id: true, name: true, url: true, currentStatus: true },
            },
          },
        },
      },
    });
  }

  static async createStatusPage(
    teamId: string,
    data: {
      name: string;
      slug: string;
      description?: string | null;
      isPublic?: boolean;
      monitorIds: string[];
    }
  ) {
    // Check slug uniqueness
    const existing = await prisma.statusPage.findUnique({
      where: { slug: data.slug.toLowerCase() },
    });

    if (existing) {
      throw new AppError('This public slug is already taken. Please choose another.', 409, 'SLUG_TAKEN');
    }

    return prisma.$transaction(async (tx) => {
      const page = await tx.statusPage.create({
        data: {
          teamId,
          name: data.name,
          slug: data.slug.toLowerCase(),
          description: data.description,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
        },
      });

      // Link selected monitors
      if (data.monitorIds && data.monitorIds.length > 0) {
        await tx.statusPageMonitor.createMany({
          data: data.monitorIds.map((mId, idx) => ({
            statusPageId: page.id,
            monitorId: mId,
            displayOrder: idx,
          })),
        });
      }

      return page;
    });
  }

  static async getPublicStatusPage(slug: string) {
    const page = await prisma.statusPage.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        monitors: {
          orderBy: { displayOrder: 'asc' },
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                currentStatus: true,
                uptimePercentage: true,
                lastCheckedAt: true,
              },
            },
          },
        },
      },
    });

    if (!page || !page.isPublic) {
      throw new AppError('Status page not found or private', 404, 'NOT_FOUND');
    }

    const monitorIds = page.monitors.map((m) => m.monitorId);

    // Fetch active and recent incidents for these monitors
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: monitorIds },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        monitor: { select: { name: true } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Overall system status calculation
    const hasDown = page.monitors.some((m) => m.monitor.currentStatus === MonitorStatus.DOWN);
    const activeIncidents = incidents.filter((i) => i.status !== IncidentStatus.RESOLVED);

    let systemStatus = 'ALL_OPERATIONAL';
    if (activeIncidents.length > 0 || hasDown) {
      systemStatus = page.monitors.every((m) => m.monitor.currentStatus === MonitorStatus.DOWN)
        ? 'MAJOR_OUTAGE'
        : 'PARTIAL_OUTAGE';
    }

    return {
      name: page.name,
      description: page.description,
      slug: page.slug,
      systemStatus,
      updatedAt: page.updatedAt,
      services: page.monitors.map((item) => ({
        id: item.monitor.id,
        name: item.monitor.name,
        status: item.monitor.currentStatus,
        uptimePercentage: item.monitor.uptimePercentage,
        lastCheckedAt: item.monitor.lastCheckedAt,
      })),
      incidents: incidents.map((inc) => ({
        id: inc.id,
        title: inc.title,
        status: inc.status,
        serviceName: inc.monitor.name,
        failureReason: inc.failureReason,
        startedAt: inc.startedAt,
        resolvedAt: inc.resolvedAt,
        durationSeconds: inc.durationSeconds,
        updates: inc.updates,
      })),
    };
  }

  static async deleteStatusPage(id: string, teamId: string) {
    const page = await prisma.statusPage.findFirst({
      where: { id, teamId },
    });

    if (!page) {
      throw new AppError('Status page not found', 404, 'NOT_FOUND');
    }

    await prisma.statusPage.delete({ where: { id } });
    return { success: true };
  }
}
