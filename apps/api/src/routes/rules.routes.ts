import { Router } from 'express';
import { rulesController } from '../controllers/rules.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', rulesController.list);
router.post('/', rulesController.create);
router.get('/:id', rulesController.getById);
router.patch('/:id', rulesController.update);
router.delete('/:id', rulesController.delete);
router.patch('/:id/toggle', rulesController.toggle);

export default router;
