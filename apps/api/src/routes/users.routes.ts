import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/managers', usersController.getManagers);
router.get('/', requireRole('ADMIN', 'MANAGER'), usersController.list);
router.post('/', requireRole('ADMIN'), usersController.create);
router.get('/:id', usersController.getById);
router.patch('/:id', requireRole('ADMIN'), usersController.update);
router.delete('/:id', requireRole('ADMIN'), usersController.delete);

export default router;
