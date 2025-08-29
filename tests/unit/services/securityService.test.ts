import { SecurityService, LoginAttemptData, SecurityMetrics } from '../../../src/services/securityService';
import { EmailService } from '../../../src/services/emailService';
import { logger } from '../../../src/middleware/logging';
import { Request } from 'express';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn()
}));
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/middleware/logging');

const mockDb = require('../../../src/config/database').db;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SecurityService', () => {
  // Test data
  const testEmail = 'test@example.com';
  const testAttemptData: LoginAttemptData = {
    email: testEmail,
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Test Browser',
    successful: false,
    attemptType: 'login',
    additionalInfo: { timestamp: new Date().toISOString() }
  };

  const mockUser = {
    id: 'user-123',
    email: testEmail,
    first_name: 'Test'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database query builder
    const mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      raw: jest.fn()
    };

    mockDb.mockReturnValue(mockQueryBuilder);

    // Setup logger mocks
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
  });

  describe('recordLoginAttempt', () => {
    it('should record login attempt successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue([1]);
      mockDb.mockReturnValue({ insert: mockInsert });

      await SecurityService.recordLoginAttempt(testAttemptData);

      expect(mockDb).toHaveBeenCalledWith('login_attempts');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: testAttemptData.userId,
        email: testAttemptData.email.toLowerCase().trim(),
        ip_address: testAttemptData.ipAddress,
        user_agent: testAttemptData.userAgent,
        attempt_type: testAttemptData.attemptType,
        successful: testAttemptData.successful,
        additional_info: testAttemptData.additionalInfo,
        attempted_at: expect.any(Date)
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Login attempt recorded',
        {
          email: testAttemptData.email,
          ipAddress: testAttemptData.ipAddress,
          successful: testAttemptData.successful,
          attemptType: testAttemptData.attemptType
        }
      );
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      const mockInsert = jest.fn().mockRejectedValue(error);
      mockDb.mockReturnValue({ insert: mockInsert });

      await SecurityService.recordLoginAttempt(testAttemptData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to record login attempt',
        {
          error: error.message,
          email: testAttemptData.email,
          ipAddress: testAttemptData.ipAddress
        }
      );
    });

    it('should trigger security alerts for failed login attempts', async () => {
      const mockInsert = jest.fn().mockResolvedValue([1]);
      mockDb.mockReturnValue({ insert: mockInsert });

      // Mock checkAndSendSecurityAlerts method
      const checkAndSendSecurityAlertsSpy = jest.spyOn(SecurityService as any, 'checkAndSendSecurityAlerts')
        .mockResolvedValue(undefined);

      await SecurityService.recordLoginAttempt(testAttemptData);

      expect(checkAndSendSecurityAlertsSpy).toHaveBeenCalledWith(testAttemptData);

      checkAndSendSecurityAlertsSpy.mockRestore();
    });

    it('should not trigger security alerts for successful attempts', async () => {
      const mockInsert = jest.fn().mockResolvedValue([1]);
      mockDb.mockReturnValue({ insert: mockInsert });

      const successfulAttempt = { ...testAttemptData, successful: true };

      // Mock checkAndSendSecurityAlerts method
      const checkAndSendSecurityAlertsSpy = jest.spyOn(SecurityService as any, 'checkAndSendSecurityAlerts')
        .mockResolvedValue(undefined);

      await SecurityService.recordLoginAttempt(successfulAttempt);

      expect(checkAndSendSecurityAlertsSpy).not.toHaveBeenCalled();

      checkAndSendSecurityAlertsSpy.mockRestore();
    });
  });

  describe('checkAccountLockout', () => {
    it('should return correct metrics for account with no failed attempts', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail);

      expect(metrics).toEqual({
        failedAttempts: 0,
        lastFailedAttempt: null,
        accountLocked: false,
        lockoutExpiry: null,
        remainingAttempts: 5
      });
    });

    it('should return correct metrics for account with failed attempts below threshold', async () => {
      const failedAttempts = [
        { attempted_at: new Date() },
        { attempted_at: new Date(Date.now() - 5 * 60 * 1000) }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(failedAttempts)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail);

      expect(metrics.failedAttempts).toBe(2);
      expect(metrics.accountLocked).toBe(false);
      expect(metrics.remainingAttempts).toBe(3);
      expect(metrics.lastFailedAttempt).toEqual(failedAttempts[0].attempted_at);
    });

    it('should return locked account metrics when threshold exceeded', async () => {
      const lastFailedAttempt = new Date();
      const failedAttempts = Array(5).fill(null).map((_, i) => ({
        attempted_at: new Date(lastFailedAttempt.getTime() - i * 60 * 1000)
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(failedAttempts)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail);

      expect(metrics.failedAttempts).toBe(5);
      expect(metrics.accountLocked).toBe(true);
      expect(metrics.remainingAttempts).toBe(0);
      expect(metrics.lockoutExpiry).toEqual(
        new Date(lastFailedAttempt.getTime() + 15 * 60 * 1000)
      );
    });

    it('should check if lockout has expired', async () => {
      const oldFailedAttempt = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const failedAttempts = Array(5).fill(null).map(() => ({
        attempted_at: oldFailedAttempt
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(failedAttempts)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail);

      expect(metrics.failedAttempts).toBe(5);
      expect(metrics.accountLocked).toBe(false); // Lockout should have expired
      expect(metrics.lockoutExpiry).toBe(null);
      expect(metrics.remainingAttempts).toBe(5);
    });

    it('should handle different attempt types', async () => {
      const failedAttempts = Array(3).fill(null).map(() => ({
        attempted_at: new Date()
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(failedAttempts)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail, 'password_reset');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        email: testEmail.toLowerCase(),
        attempt_type: 'password_reset',
        successful: false
      });

      expect(metrics.failedAttempts).toBe(3);
      expect(metrics.accountLocked).toBe(true); // Max 3 for password reset
      expect(metrics.remainingAttempts).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(error)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const metrics = await SecurityService.checkAccountLockout(testEmail);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to check account lockout',
        { error: error.message, email: testEmail }
      );

      // Should return safe defaults
      expect(metrics).toEqual({
        failedAttempts: 0,
        lastFailedAttempt: null,
        accountLocked: false,
        lockoutExpiry: null,
        remainingAttempts: 5
      });
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return comprehensive security metrics', async () => {
      const loginMetrics: SecurityMetrics = {
        failedAttempts: 2,
        lastFailedAttempt: new Date(),
        accountLocked: false,
        lockoutExpiry: null,
        remainingAttempts: 3
      };

      const passwordResetMetrics: SecurityMetrics = {
        failedAttempts: 0,
        lastFailedAttempt: null,
        accountLocked: false,
        lockoutExpiry: null,
        remainingAttempts: 3
      };

      const recentAttempts = [
        {
          id: 1,
          attempt_type: 'login',
          successful: false,
          ip_address: '192.168.1.1',
          user_agent: 'Test Browser',
          attempted_at: new Date()
        }
      ];

      // Mock the checkAccountLockout calls
      jest.spyOn(SecurityService, 'checkAccountLockout')
        .mockResolvedValueOnce(loginMetrics)
        .mockResolvedValueOnce(passwordResetMetrics);

      // Mock recent attempts query
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(recentAttempts)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      const result = await SecurityService.getSecurityMetrics(testEmail);

      expect(result).toEqual({
        loginMetrics,
        passwordResetMetrics,
        recentAttempts: [{
          id: 1,
          attemptType: 'login',
          successful: false,
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          attemptedAt: recentAttempts[0].attempted_at
        }]
      });
    });

    it('should handle errors and throw appropriate error', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(SecurityService, 'checkAccountLockout').mockRejectedValue(error);

      await expect(SecurityService.getSecurityMetrics(testEmail))
        .rejects.toThrow('Failed to retrieve security metrics');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get security metrics',
        { error: error.message, email: testEmail }
      );
    });
  });

  describe('resetFailedAttempts', () => {
    it('should log reset operation', async () => {
      await SecurityService.resetFailedAttempts(testEmail);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Failed attempts reset (implicit)',
        { email: testEmail.toLowerCase(), attemptType: 'login' }
      );
    });

    it('should handle errors gracefully', async () => {
      // Force an error by making logger.info throw
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      // Should not throw
      await expect(SecurityService.resetFailedAttempts(testEmail))
        .resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to reset login attempts',
        { error: 'Logger error', email: testEmail }
      );
    });
  });

  describe('extractSecurityInfo', () => {
    it('should extract security info from request', () => {
      const mockRequest: Partial<Request> = {
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: {
          'user-agent': 'Test Browser',
          'accept-language': 'en-US,en;q=0.9',
          referer: 'https://example.com'
        },
        get: jest.fn().mockReturnValue('Test Browser')
      };

      const result = SecurityService.extractSecurityInfo(mockRequest as Request);

      expect(result).toEqual({
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        additionalInfo: {
          timestamp: expect.any(String),
          method: 'POST',
          path: '/api/v1/auth/login',
          referer: 'https://example.com',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      });
    });

    it('should handle missing IP address', () => {
      const mockRequest: Partial<Request> = {
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: {},
        get: jest.fn().mockReturnValue(undefined),
        connection: {},
        socket: {}
      };

      const result = SecurityService.extractSecurityInfo(mockRequest as Request);

      expect(result.ipAddress).toBe('unknown');
    });

    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest: Partial<Request> = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1'
        },
        method: 'GET',
        path: '/api/v1/auth/me',
        get: jest.fn().mockReturnValue(undefined),
        connection: {},
        socket: {}
      };

      const result = SecurityService.extractSecurityInfo(mockRequest as Request);

      expect(result.ipAddress).toBe('203.0.113.1');
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should clean up old login attempts', async () => {
      const mockDelete = jest.fn().mockResolvedValue(10);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        delete: mockDelete
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      await SecurityService.cleanupOldAttempts();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'attempted_at',
        '<',
        expect.any(Date)
      );
      expect(mockDelete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up old login attempts',
        {
          deletedCount: 10,
          cutoffDate: expect.any(String)
        }
      );
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Database error');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockRejectedValue(error)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      await SecurityService.cleanupOldAttempts();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cleanup old login attempts',
        { error: error.message }
      );
    });
  });

  describe('getSecurityDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const mockStats = {
        total_attempts: '100',
        failed_attempts: '20',
        successful_attempts: '80'
      };

      const mockUserStats = {
        unique_users: '50',
        unique_ips: '30'
      };

      const mockTopEmails = [
        { email: 'user1@example.com', attempts: '5' },
        { email: 'user2@example.com', attempts: '3' }
      ];

      const mockTopIPs = [
        { ip: '192.168.1.1', attempts: '8' },
        { ip: '10.0.0.1', attempts: '4' }
      ];

      const mockHourlyData = [
        { hour: '0', attempts: '10', failures: '2' },
        { hour: '1', attempts: '15', failures: '3' }
      ];

      // Mock all the parallel queries
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        first: jest.fn()
      };

      mockDb.mockReturnValue(mockQueryBuilder);

      // Setup different return values for different calls
      mockQueryBuilder.first
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockUserStats);

      mockQueryBuilder.limit
        .mockResolvedValueOnce(mockTopEmails)
        .mockResolvedValueOnce(mockTopIPs);

      mockQueryBuilder.orderBy.mockResolvedValueOnce(mockHourlyData);

      const result = await SecurityService.getSecurityDashboard();

      expect(result).toEqual({
        totalAttempts: 100,
        failedAttempts: 20,
        successfulAttempts: 80,
        uniqueUsers: 50,
        uniqueIPs: 30,
        topFailedEmails: [
          { email: 'user1@example.com', attempts: 5 },
          { email: 'user2@example.com', attempts: 3 }
        ],
        topFailedIPs: [
          { ip: '192.168.1.1', attempts: 8 },
          { ip: '10.0.0.1', attempts: 4 }
        ],
        hourlyDistribution: [
          { hour: 0, attempts: 10, failures: 2 },
          { hour: 1, attempts: 15, failures: 3 }
        ]
      });
    });

    it('should handle dashboard errors', async () => {
      const error = new Error('Dashboard query failed');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(error)
      };
      mockDb.mockReturnValue(mockQueryBuilder);

      await expect(SecurityService.getSecurityDashboard())
        .rejects.toThrow('Failed to retrieve security dashboard data');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get security dashboard data',
        { error: error.message }
      );
    });
  });

  describe('checkAndSendSecurityAlerts (private method)', () => {
    it('should send security alert for suspicious activity', async () => {
      const recentFailures = [
        { ip_address: '192.168.1.1', user_agent: 'Browser1', attempted_at: new Date() },
        { ip_address: '10.0.0.1', user_agent: 'Browser2', attempted_at: new Date() },
        { ip_address: '203.0.113.1', user_agent: 'Browser3', attempted_at: new Date() },
        { ip_address: '192.168.1.1', user_agent: 'Browser1', attempted_at: new Date() }
      ];

      // Mock query for recent failures
      const failuresQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(recentFailures)
      };

      // Mock query for user lookup
      const userQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };

      mockDb
        .mockReturnValueOnce(failuresQueryBuilder)
        .mockReturnValueOnce(userQueryBuilder);

      mockEmailService.sendSecurityAlert.mockResolvedValue();

      // Access private method
      await (SecurityService as any).checkAndSendSecurityAlerts(testAttemptData);

      expect(mockEmailService.sendSecurityAlert).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name,
        'Multiple Failed Login Attempts',
        {
          ip: testAttemptData.ipAddress,
          userAgent: testAttemptData.userAgent,
          attemptCount: 4,
          uniqueIPs: 3,
          timeWindow: '30 minutes'
        }
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security alert sent for suspicious login activity',
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          failureCount: 4,
          uniqueIPs: 3
        })
      );
    });

    it('should not send alert for normal activity', async () => {
      const recentFailures = [
        { ip_address: '192.168.1.1', user_agent: 'Browser1', attempted_at: new Date() }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(recentFailures)
      };

      mockDb.mockReturnValue(mockQueryBuilder);

      await (SecurityService as any).checkAndSendSecurityAlerts(testAttemptData);

      expect(mockEmailService.sendSecurityAlert).not.toHaveBeenCalled();
    });

    it('should handle email service errors gracefully', async () => {
      const recentFailures = Array(5).fill(null).map((_, i) => ({
        ip_address: `192.168.1.${i + 1}`,
        user_agent: 'Browser',
        attempted_at: new Date()
      }));

      const failuresQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(recentFailures)
      };

      const userQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };

      mockDb
        .mockReturnValueOnce(failuresQueryBuilder)
        .mockReturnValueOnce(userQueryBuilder);

      const emailError = new Error('Email service unavailable');
      mockEmailService.sendSecurityAlert.mockRejectedValue(emailError);

      await (SecurityService as any).checkAndSendSecurityAlerts(testAttemptData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send security alert email',
        {
          error: emailError.message,
          email: testEmail.toLowerCase()
        }
      );
    });
  });
});