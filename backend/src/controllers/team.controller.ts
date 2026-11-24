import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';
import { sendSuccess } from '../utils/response';

export class TeamController {
  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.getTeamDetails(req.user!.activeTeamId!);
      return sendSuccess(res, team);
    } catch (error) {
      return next(error);
    }
  }

  static async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await TeamService.inviteMember(
        req.user!.activeTeamId!,
        req.user!.id,
        req.body.email,
        req.body.role
      );
      return sendSuccess(res, invitation, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TeamService.removeMember(
        req.user!.activeTeamId!,
        req.params.userId,
        req.user!.id
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
