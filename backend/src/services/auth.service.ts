import crypto from 'crypto';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@devpulse/shared';
import { logger } from '../utils/logger';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    name: string;
    teamName?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);
    const teamSlugBase = (data.teamName || `${data.name}'s Team`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    const teamSlug = `${teamSlugBase}-${crypto.randomBytes(3).toString('hex')}`;

    // Create user and initial default team transactionally
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: data.name,
        },
      });

      const team = await tx.team.create({
        data: {
          name: data.teamName || `${data.name}'s Team`,
          slug: teamSlug,
          ownerId: newUser.id,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: newUser.id,
          role: UserRole.OWNER,
        },
      });

      // Also create a default email notification channel
      await tx.notificationChannel.create({
        data: {
          teamId: team.id,
          type: 'EMAIL',
          destination: newUser.email,
          isEnabled: true,
          notifyOnDown: true,
          notifyOnRecovery: true,
        },
      });

      return {
        ...newUser,
        team,
      };
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      teamId: user.team.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      team: {
        id: user.team.id,
        name: user.team.name,
        slug: user.team.slug,
        role: UserRole.OWNER,
      },
      token,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const primaryMembership = user.teamMembers[0];
    const token = signToken({
      userId: user.id,
      email: user.email,
      teamId: primaryMembership?.teamId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      team: primaryMembership
        ? {
            id: primaryMembership.team.id,
            name: primaryMembership.team.name,
            slug: primaryMembership.team.slug,
            role: primaryMembership.role,
          }
        : null,
      token,
    };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // We do not leak user existence, always return success
    if (!user) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    logger.info(`Password reset requested for ${email}. Token: ${token}`);
    return { success: true, resetToken: token };
  }

  static async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { success: true };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      teams: user.teamMembers.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
        slug: tm.team.slug,
        role: tm.role,
      })),
    };
  }

  static async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const isValid = await comparePassword(currentPass, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    const passwordHash = await hashPassword(newPass);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
