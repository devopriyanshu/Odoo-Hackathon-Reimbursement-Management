import 'dotenv/config';
import './config/env'; // Validate env on startup
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import expenseRoutes from './routes/expenses.routes';
import approvalRoutes from './routes/approvals.routes';
import ruleRoutes from './routes/rules.routes';
import companyRoutes from './routes/company.routes';
import ocrRoutes from './routes/ocr.routes';

const app = express();

// Security & parsing
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/ocr', ocrRoutes);

// Global error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
  logger.info(`📊 Environment: ${env.NODE_ENV}`);
});

export default app;
