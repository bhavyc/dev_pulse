import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@devpulse/shared';

export class TeamService {
  static async getTeamDetails(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
            },
          },
        },
        invitations: {
          where: { expiresAt: { gt: new Date() } },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'NOT_FOUND');
    }

    return team;
  }

  static async inviteMember(
    teamId: string,
    invitedById: string,
    email: string,
    role: UserRole = UserRole.MEMBER
  ) {
    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new AppError('This user is already a member of this team', 409, 'ALREADY_MEMBER');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.invitation.create({
      data: {
        teamId,
        email: email.toLowerCase(),
        role,
        token,
        invitedById,
        expiresAt,
      },
    });
  }

  static async removeMember(teamId: string, targetUserId: string, requesterUserId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'NOT_FOUND');
    }

    if (team.ownerId === targetUserId) {
      throw new AppError('The team owner cannot be removed', 400, 'CANNOT_REMOVE_OWNER');
    }

    const requesterMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: requesterUserId,
        },
      },
    });

    if (!requesterMember || requesterMember.role !== UserRole.OWNER) {
      throw new AppError('Only the team owner can remove members', 403, 'FORBIDDEN');
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  }
}
