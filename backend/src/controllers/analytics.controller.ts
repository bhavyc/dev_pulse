import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getOverview(req.user!.activeTeamId!);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getUptime(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getUptimeStats(req.user!.activeTeamId!);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }
}
