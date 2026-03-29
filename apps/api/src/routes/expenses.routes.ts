import { Router } from 'express';
import { expenseController } from '../controllers/expenses.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema } from '../validators/expense.validator';

const router = Router();

router.use(authenticate);

router.get('/stats', expenseController.stats);
router.get('/export', expenseController.export);
router.get('/', validate({ query: expenseQuerySchema }), expenseController.list);
router.post('/', validate({ body: createExpenseSchema }), expenseController.create);
router.get('/:id', expenseController.getById);
router.patch('/:id', validate({ body: updateExpenseSchema }), expenseController.update);
router.delete('/:id', expenseController.cancel);

export default router;
