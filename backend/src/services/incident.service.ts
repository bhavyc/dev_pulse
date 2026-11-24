import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { IncidentStatus } from '@devpulse/shared';

export class IncidentService {
  static async listIncidents(
    teamId: string,
    status?: IncidentStatus,
    page = 1,
    limit = 20
  ) {
    const where: any = {
      monitor: { teamId },
    };

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          monitor: {
            select: { id: true, name: true, url: true, httpMethod: true },
          },
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return {
      incidents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getIncidentById(incidentId: string, teamId: string) {
    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        monitor: { teamId },
      },
      include: {
        monitor: true,
        updates: {
          orderBy: { createdAt: 'asc' },
        },
        alertLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!incident) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }

    return incident;
  }

  static async addIncidentUpdate(
    incidentId: string,
    teamId: string,
    data: { status: IncidentStatus; message: string }
  ) {
    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        monitor: { teamId },
      },
    });

    if (!incident) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }

    const isResolving = data.status === IncidentStatus.RESOLVED && incident.status !== IncidentStatus.RESOLVED;

    return prisma.$transaction(async (tx) => {
      const update = await tx.incidentUpdate.create({
        data: {
          incidentId,
          status: data.status,
          message: data.message,
        },
      });

      const incidentUpdateData: any = { status: data.status };
      if (isResolving) {
        incidentUpdateData.resolvedAt = new Date();
        incidentUpdateData.durationSeconds = Math.round(
          (Date.now() - incident.startedAt.getTime()) / 1000
        );
      }

      const updatedIncident = await tx.incident.update({
        where: { id: incidentId },
        data: incidentUpdateData,
      });

      return { update, incident: updatedIncident };
    });
  }
}
