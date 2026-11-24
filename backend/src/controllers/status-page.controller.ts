import { Request, Response, NextFunction } from 'express';
import { StatusPageService } from '../services/status-page.service';
import { sendSuccess } from '../utils/response';

export class StatusPageController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pages = await StatusPageService.listStatusPages(req.user!.activeTeamId!);
      return sendSuccess(res, pages);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const page = await StatusPageService.createStatusPage(
        req.user!.activeTeamId!,
        req.body
      );
      return sendSuccess(res, page, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StatusPageService.getPublicStatusPage(req.params.slug);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await StatusPageService.deleteStatusPage(
        req.params.id,
        req.user!.activeTeamId!
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
