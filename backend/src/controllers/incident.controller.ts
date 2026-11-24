import { Request, Response, NextFunction } from 'express';
import { IncidentService } from '../services/incident.service';
import { sendSuccess } from '../utils/response';
import { IncidentStatus } from '@devpulse/shared';

export class IncidentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as IncidentStatus | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await IncidentService.listIncidents(
        req.user!.activeTeamId!,
        status,
        page,
        limit
      );

      return sendSuccess(res, result.incidents, 200, {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const incident = await IncidentService.getIncidentById(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, incident);
    } catch (error) {
      return next(error);
    }
  }

  static async addUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await IncidentService.addIncidentUpdate(
        req.params.id,
        req.user!.activeTeamId!,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (error) {
      return next(error);
    }
  }
}
