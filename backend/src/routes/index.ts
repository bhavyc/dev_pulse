import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { monitorRoutes } from './monitor.routes';
import { analyticsRoutes } from './analytics.routes';
import { incidentRoutes } from './incident.routes';
import { notificationRoutes } from './notification.routes';
import { statusPageRoutes } from './status-page.routes';
import { teamRoutes } from './team.routes';
import { sendSuccess } from '../utils/response';

const router = Router();

// Health check endpoint (for keepalive pingers on Render)
router.get('/health', (_req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'DevPulse API',
  });
});

router.use('/auth', authRoutes);
router.use('/monitors', monitorRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/incidents', incidentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/status-pages', statusPageRoutes);
router.use('/teams', teamRoutes);

export const apiRouter = router;
