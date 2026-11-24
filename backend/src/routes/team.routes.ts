import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth.middleware';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.middleware';
import { UserRole } from '@devpulse/shared';

const router = Router();

router.use(authenticate);

const inviteSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
  }),
});

router.get('/members', TeamController.getMembers);
router.post('/invitations', validateRequest(inviteSchema), TeamController.invite);
router.delete('/members/:userId', TeamController.removeMember);

export const teamRoutes = router;
