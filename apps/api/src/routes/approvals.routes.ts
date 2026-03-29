import { Router } from 'express';
import { approvalController } from '../controllers/approvals.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';


const router = Router();
router.use(authenticate);

router.get('/pending', approvalController.getPending);
router.get('/history', approvalController.getHistory);
router.post('/:expenseId/approve', approvalController.approve);
router.post('/:expenseId/reject', approvalController.reject);
router.post('/:expenseId/override', requireRole('ADMIN'), approvalController.override);

export default router;
