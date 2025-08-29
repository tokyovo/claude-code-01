import { Router } from 'express';
import { ApiResponse } from '../types/express';
import healthRoutes from './health';
import authRoutes from './auth';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

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
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          refresh: 'POST /api/v1/auth/refresh',
          logout: 'POST /api/v1/auth/logout',
          'logout-all': 'POST /api/v1/auth/logout-all',
          me: 'GET /api/v1/auth/me',
          'verify-email': 'POST /api/v1/auth/verify-email',
          'resend-verification': 'POST /api/v1/auth/resend-verification',
          'forgot-password': 'POST /api/v1/auth/forgot-password',
          'reset-password': 'POST /api/v1/auth/reset-password',
          'change-password': 'PUT /api/v1/auth/change-password',
          profile: 'PUT /api/v1/auth/profile',
          session: 'GET /api/v1/auth/session'
        },
        docs: '/api/v1/docs', // Future API documentation
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

// Future route modules will be added here
// router.use('/users', userRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/budgets', budgetRoutes);
// router.use('/goals', goalRoutes);
// router.use('/reports', reportRoutes);

export default router;