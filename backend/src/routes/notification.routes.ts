import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.middleware';

import { AlertChannelType } from '@devpulse/shared';

const router = Router();

router.use(authenticate);

const channelSchema = z.object({
  body: z.object({
    type: z.nativeEnum(AlertChannelType).default(AlertChannelType.EMAIL),
    destination: z.string().min(5, 'Valid destination (email or webhook URL) is required'),
    notifyOnDown: z.boolean().default(true),
    notifyOnRecovery: z.boolean().default(true),
  }),
});

// List channels
router.get('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await prisma.notificationChannel.findMany({
      where: { teamId: req.user!.activeTeamId! },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, channels);
  } catch (error) {
    return next(error);
  }
});

// Add notification channel
router.post('/channels', validateRequest(channelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await prisma.notificationChannel.create({
      data: {
        teamId: req.user!.activeTeamId!,
        type: req.body.type || AlertChannelType.EMAIL,
        destination: req.body.destination,
        notifyOnDown: req.body.notifyOnDown,
        notifyOnRecovery: req.body.notifyOnRecovery,
        isEnabled: true,
      },
    });
    return sendSuccess(res, channel, 201);
  } catch (error) {
    return next(error);
  }
});

// Delete channel
router.delete('/channels/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await prisma.notificationChannel.findFirst({
      where: { id: req.params.id, teamId: req.user!.activeTeamId! },
    });
    if (!channel) return sendError(res, 'Channel not found', 404);

    await prisma.notificationChannel.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { success: true });
  } catch (error) {
    return next(error);
  }
});

// Get alert logs / history
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.alertLog.findMany({
      where: {
        incident: {
          monitor: { teamId: req.user!.activeTeamId! },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: {
        incident: {
          select: { title: true, monitor: { select: { name: true } } },
        },
      },
    });
    return sendSuccess(res, logs);
  } catch (error) {
    return next(error);
  }
});

export const notificationRoutes = router;
