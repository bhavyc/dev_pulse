import { Router } from 'express';
import { StatusPageController } from '../controllers/status-page.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createStatusPageSchema } from '../validators/status-page.validator';

const router = Router();

// Unauthenticated public status page view
router.get('/public/:slug', StatusPageController.getPublic);

// Authenticated management
router.use(authenticate);
router.get('/', StatusPageController.list);
router.post('/', validateRequest(createStatusPageSchema), StatusPageController.create);
router.delete('/:id', StatusPageController.delete);

export const statusPageRoutes = router;
