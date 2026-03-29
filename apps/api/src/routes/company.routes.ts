import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/currencies', companyController.getCurrencies);
router.get('/', companyController.get);
router.patch('/', requireRole('ADMIN'), companyController.update);
router.post('/policy', requireRole('ADMIN'), companyController.uploadPolicy);

export default router;
