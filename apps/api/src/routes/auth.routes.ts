import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { signupSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/signup', authLimiter, validate({ body: signupSchema }), authController.signup);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/refresh', authController.refresh);

export default router;
