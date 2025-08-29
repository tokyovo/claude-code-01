import { Router } from 'express';
import { ApiResponse } from '@/types/express';
import healthRoutes from './health';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// API root endpoint
router.get('/', (_req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Personal Finance Tracker API',
    data: {
      version: '1.0.0',
      description: 'Backend API for Personal Finance Tracker application',
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/v1/docs', // Future API documentation
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

// Future route modules will be added here
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/budgets', budgetRoutes);
// router.use('/goals', goalRoutes);
// router.use('/reports', reportRoutes);

export default router;