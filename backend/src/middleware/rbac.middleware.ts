import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@devpulse/shared';
import { sendError } from '../utils/response';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const userRole = req.user.activeTeamRole as UserRole;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    return next();
  };
};
