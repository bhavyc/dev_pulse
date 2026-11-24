import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller';
import { authenticate } from '../middleware/auth.middleware';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.middleware';
import { IncidentStatus } from '@devpulse/shared';

const router = Router();

router.use(authenticate);

const incidentUpdateSchema = z.object({
  body: z.object({
    status: z.nativeEnum(IncidentStatus),
    message: z.string().min(2, 'Update message must be at least 2 characters'),
  }),
});

router.get('/', IncidentController.list);
router.get('/:id', IncidentController.getById);
router.post('/:id/updates', validateRequest(incidentUpdateSchema), IncidentController.addUpdate);

export const incidentRoutes = router;
