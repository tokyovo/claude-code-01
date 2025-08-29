import { Router } from 'express';
import { 
  healthCheck, 
  detailedHealthCheck,
  readinessCheck, 
  livenessCheck 
} from '@/controllers/healthController';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', healthCheck);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with service status
 * @access  Public
 */
router.get('/detailed', (req, res) => {
  console.log('Detailed health check endpoint called');
  res.json({ 
    success: true, 
    message: 'Detailed health check - coming soon',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for load balancers
 * @access  Public
 */
router.get('/ready', readinessCheck);

/**
 * @route   GET /health/live
 * @desc    Liveness probe for container orchestrators
 * @access  Public
 */
router.get('/live', livenessCheck);

export default router;