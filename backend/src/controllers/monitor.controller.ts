import { Request, Response, NextFunction } from 'express';
import { MonitorService } from '../services/monitor.service';
import { sendSuccess } from '../utils/response';

export class MonitorController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const monitors = await MonitorService.listMonitors(req.user!.activeTeamId!);
      return sendSuccess(res, monitors);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const monitor = await MonitorService.getMonitorById(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, monitor);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const monitor = await MonitorService.createMonitor(
        req.user!.activeTeamId!,
        req.body
      );
      return sendSuccess(res, monitor, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const monitor = await MonitorService.updateMonitor(
        req.params.id,
        req.user!.activeTeamId!,
        req.body
      );
      return sendSuccess(res, monitor);
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MonitorService.deleteMonitor(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }

  static async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const monitor = await MonitorService.pauseMonitor(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, monitor);
    } catch (error) {
      return next(error);
    }
  }

  static async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const monitor = await MonitorService.resumeMonitor(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, monitor);
    } catch (error) {
      return next(error);
    }
  }

  static async getChecks(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const result = await MonitorService.getMonitorChecks(
        req.params.id,
        req.user!.activeTeamId!,
        page,
        limit
      );
      return sendSuccess(res, result.checks, 200, {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }
}
