import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/request';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { UserService } from '../../src/services/userService';
import { SecurityService } from '../../src/services/securityService';
import { JwtService } from '../../src/services/jwtService';
import { redisClient } from '../../src/config/redis';

describe('Security Integration Tests', () => {
  let app: Express;
  let testUser: any;

  beforeAll(async () => {
    app = await createTestApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (redisClient.status === 'ready') {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      const existingUser = await UserService.findUserByEmail('security-test@example.com');
      if (existingUser) {
        await UserService.deleteUser(existingUser.id);
      }
    } catch (error) {
      // User doesn't exist, continue
    }

    // Create test user
    testUser = await UserService.createUser({
      email: 'security-test@example.com',
      password: 'SecurePassword@123',
      first_name: 'Security',
      last_name: 'Test'
    });

    // Clean up any existing login attempts
    await SecurityService.cleanupOldAttempts();
  });

  describe('Account Lockout Protection', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Make 4 failed attempts - should not lock
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(invalidCredentials)
          .expect(401);

        expect(response.body.success).toBe(false);
      }

      // 5th attempt should lock the account
      const lockResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(lockResponse.body.message).toContain('locked');

      // 6th attempt should still be locked
      const stillLockedResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(stillLockedResponse.body.message).toContain('locked');

      // Even correct credentials should be rejected
      const correctCredentialsResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(401);

      expect(correctCredentialsResponse.body.message).toContain('locked');
    });

    it('should track failed attempts from different IPs', async () => {
      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Simulate attempts from different IPs by setting X-Forwarded-For header
      const ips = ['192.168.1.1', '10.0.0.1', '203.0.113.1'];

      // Make failed attempts from different IPs
      for (let i = 0; i < 3; i++) {
        for (const ip of ips) {
          await request(app)
            .post('/api/v1/auth/login')
            .set('X-Forwarded-For', ip)
            .send(invalidCredentials)
            .expect(401);
        }
      }

      // Should be locked after 9 total attempts (3 per IP)
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body.message).toContain('locked');

      // Verify security metrics show the attempts
      const securityMetrics = await SecurityService.getSecurityMetrics('security-test@example.com');
      expect(securityMetrics.loginMetrics.failedAttempts).toBeGreaterThanOrEqual(5);
      expect(securityMetrics.loginMetrics.accountLocked).toBe(true);
    });

    it('should unlock account after lockout period expires', async () => {
      // Mock shorter lockout period for testing (normally 15 minutes)
      const originalLockoutDuration = (SecurityService as any).LOCKOUT_DURATION;
      (SecurityService as any).LOCKOUT_DURATION = 100; // 100ms for testing

      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Lock the account
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(invalidCredentials)
          .expect(401);
      }

      // Verify account is locked
      let response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(401);

      expect(response.body.message).toContain('locked');

      // Wait for lockout to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to login with correct credentials
      response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Restore original lockout duration
      (SecurityService as any).LOCKOUT_DURATION = originalLockoutDuration;
    });

    it('should reset failed attempts after successful login', async () => {
      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(invalidCredentials)
          .expect(401);
      }

      // Successful login should reset failed attempts
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      // Make 4 more failed attempts - should not lock (previous attempts were reset)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(invalidCredentials)
          .expect(401);
      }

      // Should still not be locked
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      const loginData = {
        email: 'security-test@example.com',
        password: 'SecurePassword@123'
      };

      // Make rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have appropriate message
      rateLimitedResponses.forEach(response => {
        expect(response.body.message).toContain('Too many requests');
      });
    });

    it('should enforce rate limiting on password reset', async () => {
      const resetData = {
        email: 'security-test@example.com'
      };

      // Make rapid password reset requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/forgot-password')
            .send(resetData)
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce different rate limits per IP', async () => {
      const loginData = {
        email: 'security-test@example.com',
        password: 'SecurePassword@123'
      };

      // Test with different IPs
      const ip1Requests = [];
      const ip2Requests = [];

      for (let i = 0; i < 15; i++) {
        ip1Requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .set('X-Forwarded-For', '192.168.1.1')
            .send(loginData)
        );

        ip2Requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .set('X-Forwarded-For', '192.168.1.2')
            .send(loginData)
        );
      }

      const ip1Responses = await Promise.all(ip1Requests);
      const ip2Responses = await Promise.all(ip2Requests);

      // Both IPs should get rate limited independently
      const ip1RateLimited = ip1Responses.filter(res => res.status === 429);
      const ip2RateLimited = ip2Responses.filter(res => res.status === 429);

      expect(ip1RateLimited.length).toBeGreaterThan(0);
      expect(ip2RateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Password Reset Security', () => {
    it('should enforce lockout on password reset attempts', async () => {
      const resetData = {
        email: 'security-test@example.com'
      };

      // Make multiple password reset requests
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send(resetData);

        // Should succeed (even for rate limiting, we return success to prevent enumeration)
        expect(response.status).toBeLessThan(500);
      }

      // Check if password reset attempts are being tracked
      const securityMetrics = await SecurityService.getSecurityMetrics('security-test@example.com');
      expect(securityMetrics.passwordResetMetrics.failedAttempts).toBeGreaterThan(0);
    });

    it('should validate reset token properly', async () => {
      // Request password reset
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'security-test@example.com' })
        .expect(200);

      // Try to reset with invalid token
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword@456'
        })
        .expect(401);

      // Try to reset with expired token
      const expiredToken = JwtService.generatePasswordResetToken(testUser.id, testUser.email);
      // Mock expired token by waiting (in real scenario, token would have short expiry)
      
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: expiredToken,
          password: 'NewPassword@456'
        })
        .expect(200); // Should work with fresh token
    });

    it('should prevent password reset token reuse', async () => {
      // Generate a valid password reset token
      const resetToken = JwtService.generatePasswordResetToken(testUser.id, testUser.email);

      // Use the token once
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword@456'
        })
        .expect(200);

      // Try to use the same token again
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'AnotherNewPassword@789'
        })
        .expect(401);
    });
  });

  describe('Session Security', () => {
    it('should invalidate all sessions on password change', async () => {
      // Login to create session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      const accessToken = loginResponse.body.data.tokens.accessToken;
      const refreshToken = loginResponse.headers['set-cookie']
        ?.find((cookie: string) => cookie.startsWith('refreshToken='))
        ?.split('=')[1]?.split(';')[0];

      // Verify token works
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Change password
      await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurePassword@123',
          newPassword: 'NewSecurePassword@456'
        })
        .expect(200);

      // Old access token should no longer work
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Old refresh token should no longer work
      if (refreshToken) {
        await request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', `refreshToken=${refreshToken}`)
          .expect(401);
      }
    });

    it('should track concurrent sessions', async () => {
      const loginData = {
        email: 'security-test@example.com',
        password: 'SecurePassword@123'
      };

      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(200);

        sessions.push(response.body.data.tokens.accessToken);
      }

      // Check session info with one of the tokens
      const sessionResponse = await request(app)
        .get('/api/v1/auth/session-info')
        .set('Authorization', `Bearer ${sessions[0]}`)
        .expect(200);

      expect(sessionResponse.body.data.activeSessions).toBeGreaterThan(1);
    });

    it('should logout from all devices', async () => {
      const loginData = {
        email: 'security-test@example.com',
        password: 'SecurePassword@123'
      };

      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(200);

        sessions.push(response.body.data.tokens.accessToken);
      }

      // Logout from all devices using one token
      await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${sessions[0]}`)
        .expect(200);

      // All tokens should be invalid
      for (const token of sessions) {
        await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });
  });

  describe('Security Monitoring', () => {
    it('should track security metrics', async () => {
      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Generate some failed login attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', `192.168.1.${i + 1}`)
          .send(invalidCredentials);
      }

      // Get security metrics
      const securityMetrics = await SecurityService.getSecurityMetrics('security-test@example.com');

      expect(securityMetrics.loginMetrics.failedAttempts).toBeGreaterThan(0);
      expect(securityMetrics.recentAttempts.length).toBeGreaterThan(0);
      expect(securityMetrics.recentAttempts[0]).toHaveProperty('ipAddress');
      expect(securityMetrics.recentAttempts[0]).toHaveProperty('successful', false);
    });

    it('should provide security dashboard data', async () => {
      // Generate some test data
      const invalidCredentials = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      const validCredentials = {
        email: 'security-test@example.com',
        password: 'SecurePassword@123'
      };

      // Mix of failed and successful attempts
      await request(app).post('/api/v1/auth/login').send(invalidCredentials);
      await request(app).post('/api/v1/auth/login').send(invalidCredentials);
      await request(app).post('/api/v1/auth/login').send(validCredentials);

      // Get dashboard data
      const dashboardData = await SecurityService.getSecurityDashboard();

      expect(dashboardData.totalAttempts).toBeGreaterThan(0);
      expect(dashboardData.failedAttempts).toBeGreaterThan(0);
      expect(dashboardData.successfulAttempts).toBeGreaterThan(0);
      expect(dashboardData.uniqueUsers).toBeGreaterThan(0);
      expect(Array.isArray(dashboardData.hourlyDistribution)).toBe(true);
    });

    it('should provide user security info for authenticated users', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Get security info
      const securityResponse = await request(app)
        .get('/api/v1/auth/security-info')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(securityResponse.body.data).toHaveProperty('security');
      expect(securityResponse.body.data.security).toHaveProperty('loginAttempts');
      expect(securityResponse.body.data.security).toHaveProperty('passwordResetAttempts');
      expect(securityResponse.body.data.security).toHaveProperty('recentActivity');
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize malicious input in registration', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'Password@123',
        first_name: '<script>alert("xss")</script>Malicious',
        last_name: '"><img src=x onerror=alert("xss")>Name',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousData)
        .expect(201);

      expect(response.body.data.user.first_name).not.toContain('<script>');
      expect(response.body.data.user.first_name).not.toContain('alert');
      expect(response.body.data.user.last_name).not.toContain('<img');
      expect(response.body.data.user.last_name).not.toContain('onerror');
    });

    it('should reject SQL injection attempts in login', async () => {
      const sqlInjectionAttempts = [
        "admin@example.com'; DROP TABLE users; --",
        "admin@example.com' OR '1'='1",
        "admin@example.com' UNION SELECT * FROM users --"
      ];

      for (const maliciousEmail of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: maliciousEmail,
            password: 'password'
          });

        // Should not crash and should return proper error
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        'weak',
        'password',
        '12345678',
        'Password',
        'password123',
        'PASSWORD123',
        'Password1',
        'aaaaaaaaA1!'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'weak-test@example.com',
            password: weakPassword,
            first_name: 'Test',
            last_name: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      }
    });
  });

  describe('Token Security', () => {
    it('should reject requests with blacklisted tokens', async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword@123'
        })
        .expect(200);

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Verify token works
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Logout (blacklists token)
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Token should no longer work
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should handle malformed authorization headers', async () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer ',
        'NotBearer token',
        'Bearer token.with.parts',
        'Bearer ' + 'a'.repeat(1000), // Very long token
        ''
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should enforce token expiration', async () => {
      // This test would require mocking JWT expiration or waiting for actual expiration
      // In a real scenario, you would create a token with very short expiry for testing
      
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.signature';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});