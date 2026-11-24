import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  activeTeamId?: string;
  activeTeamRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = '';

    // Check Authorization header: Bearer <token>
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.devpulse_token) {
      token = req.cookies.devpulse_token;
    }

    if (!token) {
      return sendError(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
    }

    const payload: JwtPayload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User no longer exists', 401, 'USER_NOT_FOUND');
    }

    // Determine active team (either from payload or user's first team)
    const firstMembership = user.teamMembers[0];
    const activeMembership = payload.teamId
      ? user.teamMembers.find((tm) => tm.teamId === payload.teamId) || firstMembership
      : firstMembership;

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      activeTeamId: activeMembership?.teamId,
      activeTeamRole: activeMembership?.role,
    };

    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid authentication token', 401, 'UNAUTHORIZED');
  }
};
