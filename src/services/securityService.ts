import { Request } from 'express';
import { db } from '../config/database';
import { logger } from '../middleware/logging';
import { EmailService } from './emailService';

export interface LoginAttemptData {
  email: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  successful: boolean;
  attemptType: 'login' | 'password_reset';
  additionalInfo?: Record<string, any>;
}

export interface SecurityMetrics {
  failedAttempts: number;
  lastFailedAttempt: Date | null;
  accountLocked: boolean;
  lockoutExpiry: Date | null;
  remainingAttempts: number;
}

export class SecurityService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_PASSWORD_RESET_ATTEMPTS = 3;
  private static readonly PASSWORD_RESET_LOCKOUT = 60 * 60 * 1000; // 1 hour
  private static readonly ANALYSIS_WINDOW = 60 * 60 * 1000; // 1 hour for analysis

  /**
   * Record a login attempt
   */
  static async recordLoginAttempt(attemptData: LoginAttemptData): Promise<void> {
    try {
      await db('login_attempts').insert({
        user_id: attemptData.userId || null,
        email: attemptData.email.toLowerCase().trim(),
        ip_address: attemptData.ipAddress,
        user_agent: attemptData.userAgent || null,
        attempt_type: attemptData.attemptType,
        successful: attemptData.successful,
        additional_info: attemptData.additionalInfo || null,
        attempted_at: new Date()
      });

      logger.info('Login attempt recorded', {
        email: attemptData.email,
        ipAddress: attemptData.ipAddress,
        successful: attemptData.successful,
        attemptType: attemptData.attemptType
      });

      // If this was a failed login attempt, send security alert if needed
      if (!attemptData.successful && attemptData.attemptType === 'login') {
        await this.checkAndSendSecurityAlerts(attemptData);
      }
    } catch (error) {
      logger.error('Failed to record login attempt', {
        error: error instanceof Error ? error.message : String(error),
        email: attemptData.email,
        ipAddress: attemptData.ipAddress
      });
      // Don't throw error as this is logging functionality
    }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  static async checkAccountLockout(email: string, attemptType: 'login' | 'password_reset' = 'login'): Promise<SecurityMetrics> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const windowStart = new Date(Date.now() - this.LOCKOUT_DURATION);
      const maxAttempts = attemptType === 'login' ? this.MAX_LOGIN_ATTEMPTS : this.MAX_PASSWORD_RESET_ATTEMPTS;

      // Get recent failed attempts
      const failedAttempts = await db('login_attempts')
        .where({
          email: normalizedEmail,
          attempt_type: attemptType,
          successful: false
        })
        .andWhere('attempted_at', '>', windowStart)
        .orderBy('attempted_at', 'desc');

      const metrics: SecurityMetrics = {
        failedAttempts: failedAttempts.length,
        lastFailedAttempt: failedAttempts.length > 0 ? new Date(failedAttempts[0].attempted_at) : null,
        accountLocked: failedAttempts.length >= maxAttempts,
        lockoutExpiry: null,
        remainingAttempts: Math.max(0, maxAttempts - failedAttempts.length)
      };

      // Calculate lockout expiry if account is locked
      if (metrics.accountLocked && metrics.lastFailedAttempt) {
        const lockoutDuration = attemptType === 'login' ? this.LOCKOUT_DURATION : this.PASSWORD_RESET_LOCKOUT;
        metrics.lockoutExpiry = new Date(metrics.lastFailedAttempt.getTime() + lockoutDuration);
        
        // Check if lockout has expired
        if (new Date() > metrics.lockoutExpiry) {
          metrics.accountLocked = false;
          metrics.lockoutExpiry = null;
          metrics.remainingAttempts = maxAttempts;
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to check account lockout', {
        error: error instanceof Error ? error.message : String(error),
        email
      });
      
      // Return safe default - don't lock account if there's an error
      return {
        failedAttempts: 0,
        lastFailedAttempt: null,
        accountLocked: false,
        lockoutExpiry: null,
        remainingAttempts: this.MAX_LOGIN_ATTEMPTS
      };
    }
  }

  /**
   * Reset failed login attempts for an email (called on successful login)
   */
  static async resetFailedAttempts(email: string, attemptType: 'login' | 'password_reset' = 'login'): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // We don't actually delete the records for audit purposes
      // Instead, we rely on the time window for lockout calculations
      logger.info('Failed attempts reset (implicit)', {
        email: normalizedEmail,
        attemptType
      });
    } catch (error) {
      logger.error('Failed to reset login attempts', {
        error: error instanceof Error ? error.message : String(error),
        email
      });
      // Don't throw error as this shouldn't prevent successful login
    }
  }

  /**
   * Get security metrics for an email
   */
  static async getSecurityMetrics(email: string): Promise<{
    loginMetrics: SecurityMetrics;
    passwordResetMetrics: SecurityMetrics;
    recentAttempts: any[];
  }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const windowStart = new Date(Date.now() - this.ANALYSIS_WINDOW);

      const [loginMetrics, passwordResetMetrics, recentAttempts] = await Promise.all([
        this.checkAccountLockout(normalizedEmail, 'login'),
        this.checkAccountLockout(normalizedEmail, 'password_reset'),
        db('login_attempts')
          .where({ email: normalizedEmail })
          .andWhere('attempted_at', '>', windowStart)
          .orderBy('attempted_at', 'desc')
          .limit(20)
      ]);

      return {
        loginMetrics,
        passwordResetMetrics,
        recentAttempts: recentAttempts.map(attempt => ({
          id: attempt.id,
          attemptType: attempt.attempt_type,
          successful: attempt.successful,
          ipAddress: attempt.ip_address,
          userAgent: attempt.user_agent,
          attemptedAt: attempt.attempted_at
        }))
      };
    } catch (error) {
      logger.error('Failed to get security metrics', {
        error: error instanceof Error ? error.message : String(error),
        email
      });
      throw new Error('Failed to retrieve security metrics');
    }
  }

  /**
   * Check for suspicious activity and send security alerts
   */
  private static async checkAndSendSecurityAlerts(attemptData: LoginAttemptData): Promise<void> {
    try {
      const normalizedEmail = attemptData.email.toLowerCase().trim();
      const windowStart = new Date(Date.now() - (30 * 60 * 1000)); // 30 minutes

      // Get recent failed attempts from different IPs
      const recentFailures = await db('login_attempts')
        .where({
          email: normalizedEmail,
          attempt_type: 'login',
          successful: false
        })
        .andWhere('attempted_at', '>', windowStart)
        .select(['ip_address', 'user_agent', 'attempted_at'])
        .orderBy('attempted_at', 'desc');

      // Check for suspicious patterns
      const uniqueIPs = new Set(recentFailures.map(attempt => attempt.ip_address));
      const failureCount = recentFailures.length;

      // Send security alert if:
      // 1. Multiple failed attempts from different IPs
      // 2. More than 3 failed attempts in 30 minutes
      const shouldSendAlert = (
        (uniqueIPs.size >= 2 && failureCount >= 3) ||
        failureCount >= 4
      );

      if (shouldSendAlert) {
        // Try to find user to send personalized alert
        try {
          const user = await db('users')
            .where({ email: normalizedEmail })
            .select(['id', 'email', 'first_name'])
            .first();

          if (user) {
            await EmailService.sendSecurityAlert(
              user.email,
              user.first_name,
              'Multiple Failed Login Attempts',
              {
                ip: attemptData.ipAddress,
                userAgent: attemptData.userAgent,
                attemptCount: failureCount,
                uniqueIPs: uniqueIPs.size,
                timeWindow: '30 minutes'
              }
            );

            logger.warn('Security alert sent for suspicious login activity', {
              userId: user.id,
              email: user.email,
              failureCount,
              uniqueIPs: uniqueIPs.size,
              currentIP: attemptData.ipAddress
            });
          }
        } catch (emailError) {
          logger.error('Failed to send security alert email', {
            error: emailError instanceof Error ? emailError.message : String(emailError),
            email: normalizedEmail
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check for suspicious activity', {
        error: error instanceof Error ? error.message : String(error),
        email: attemptData.email
      });
      // Don't throw error as this is background security monitoring
    }
  }

  /**
   * Extract security info from request
   */
  static extractSecurityInfo(req: Request): {
    ipAddress: string;
    userAgent?: string;
    additionalInfo: Record<string, any>;
  } {
    const ipAddress = (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    );

    const userAgent = req.get('User-Agent');
    
    const additionalInfo: Record<string, any> = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path
    };

    // Add relevant headers for security analysis (without sensitive data)
    if (req.headers.referer) {
      additionalInfo.referer = req.headers.referer;
    }
    
    if (req.headers['accept-language']) {
      additionalInfo.acceptLanguage = req.headers['accept-language'];
    }

    return {
      ipAddress,
      userAgent,
      additionalInfo
    };
  }

  /**
   * Clean up old login attempts (should be run periodically)
   */
  static async cleanupOldAttempts(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days

      const deletedCount = await db('login_attempts')
        .where('attempted_at', '<', cutoffDate)
        .delete();

      logger.info('Cleaned up old login attempts', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString()
      });
    } catch (error) {
      logger.error('Failed to cleanup old login attempts', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get comprehensive security dashboard data
   */
  static async getSecurityDashboard(timeWindow: number = 24 * 60 * 60 * 1000): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    uniqueUsers: number;
    uniqueIPs: number;
    topFailedEmails: Array<{ email: string; attempts: number }>;
    topFailedIPs: Array<{ ip: string; attempts: number }>;
    hourlyDistribution: Array<{ hour: number; attempts: number; failures: number }>;
  }> {
    try {
      const windowStart = new Date(Date.now() - timeWindow);

      // Get basic statistics
      const [stats, userStats, topEmails, topIPs, hourlyData] = await Promise.all([
        // Total attempts statistics
        db('login_attempts')
          .where('attempted_at', '>', windowStart)
          .select([
            db.raw('COUNT(*) as total_attempts'),
            db.raw('SUM(CASE WHEN successful = false THEN 1 ELSE 0 END) as failed_attempts'),
            db.raw('SUM(CASE WHEN successful = true THEN 1 ELSE 0 END) as successful_attempts')
          ])
          .first(),

        // Unique users and IPs
        db('login_attempts')
          .where('attempted_at', '>', windowStart)
          .select([
            db.raw('COUNT(DISTINCT email) as unique_users'),
            db.raw('COUNT(DISTINCT ip_address) as unique_ips')
          ])
          .first(),

        // Top failed emails
        db('login_attempts')
          .where('attempted_at', '>', windowStart)
          .andWhere('successful', false)
          .select('email')
          .count('* as attempts')
          .groupBy('email')
          .orderBy('attempts', 'desc')
          .limit(10),

        // Top failed IPs
        db('login_attempts')
          .where('attempted_at', '>', windowStart)
          .andWhere('successful', false)
          .select('ip_address as ip')
          .count('* as attempts')
          .groupBy('ip_address')
          .orderBy('attempts', 'desc')
          .limit(10),

        // Hourly distribution
        db('login_attempts')
          .where('attempted_at', '>', windowStart)
          .select([
            db.raw('EXTRACT(hour from attempted_at) as hour'),
            db.raw('COUNT(*) as attempts'),
            db.raw('SUM(CASE WHEN successful = false THEN 1 ELSE 0 END) as failures')
          ])
          .groupBy(db.raw('EXTRACT(hour from attempted_at)'))
          .orderBy('hour')
      ]);

      return {
        totalAttempts: parseInt(stats?.total_attempts || '0'),
        failedAttempts: parseInt(stats?.failed_attempts || '0'),
        successfulAttempts: parseInt(stats?.successful_attempts || '0'),
        uniqueUsers: parseInt(userStats?.unique_users || '0'),
        uniqueIPs: parseInt(userStats?.unique_ips || '0'),
        topFailedEmails: topEmails.map(item => ({
          email: item.email,
          attempts: parseInt(item.attempts as string)
        })),
        topFailedIPs: topIPs.map(item => ({
          ip: item.ip,
          attempts: parseInt(item.attempts as string)
        })),
        hourlyDistribution: hourlyData.map(item => ({
          hour: parseInt(item.hour),
          attempts: parseInt(item.attempts as string),
          failures: parseInt(item.failures as string)
        }))
      };
    } catch (error) {
      logger.error('Failed to get security dashboard data', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to retrieve security dashboard data');
    }
  }
}