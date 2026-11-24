import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createMonitorSchema, updateMonitorSchema } from '../validators/monitor.validator';

const router = Router();

router.use(authenticate);

router.get('/', MonitorController.list);
router.post('/', validateRequest(createMonitorSchema), MonitorController.create);
router.get('/:id', MonitorController.getById);
router.put('/:id', validateRequest(updateMonitorSchema), MonitorController.update);
router.delete('/:id', MonitorController.delete);
router.post('/:id/pause', MonitorController.pause);
router.post('/:id/resume', MonitorController.resume);
router.get('/:id/checks', MonitorController.getChecks);

export const monitorRoutes = router;
