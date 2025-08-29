import { JwtService, JwtPayload } from '../../../src/services/jwtService';
import { redisClient } from '../../../src/config/redis';
import jwt from 'jsonwebtoken';

// Mock Redis client
jest.mock('../../../src/config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
    expire: jest.fn()
  }
}));

// Mock logger
jest.mock('../../../src/middleware/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const mockRedis = redisClient as jest.Mocked<typeof redisClient>;

describe('JwtService', () => {
  const testUserId = 'test-user-id-123';
  const testEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default Redis mock responses
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockRedis.scard.mockResolvedValue(0);
    mockRedis.expire.mockResolvedValue(1);
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const result = await JwtService.generateTokenPair(testUserId, testEmail);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('accessTokenExpiry');
      expect(result).toHaveProperty('refreshTokenExpiry');

      // Verify tokens can be decoded
      const accessPayload = jwt.decode(result.accessToken) as JwtPayload;
      const refreshPayload = jwt.decode(result.refreshToken) as JwtPayload;

      expect(accessPayload.userId).toBe(testUserId);
      expect(accessPayload.email).toBe(testEmail);
      expect(accessPayload.type).toBe('access');

      expect(refreshPayload.userId).toBe(testUserId);
      expect(refreshPayload.email).toBe(testEmail);
      expect(refreshPayload.type).toBe('refresh');

      // Verify token expiry times
      expect(result.accessTokenExpiry.getTime()).toBeGreaterThan(Date.now());
      expect(result.refreshTokenExpiry.getTime()).toBeGreaterThan(Date.now());
      expect(result.refreshTokenExpiry.getTime()).toBeGreaterThan(result.accessTokenExpiry.getTime());
    });

    it('should store tokens in Redis', async () => {
      await JwtService.generateTokenPair(testUserId, testEmail);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `access_token:${testUserId}`,
        expect.any(Number),
        expect.any(String)
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `refresh_token:${testUserId}`,
        expect.any(Number),
        expect.any(String)
      );
      expect(mockRedis.sadd).toHaveBeenCalled();
    });

    it('should handle Redis storage errors', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));

      await expect(
        JwtService.generateTokenPair(testUserId, testEmail)
      ).rejects.toThrow('Token generation failed');
    });

    it('should generate unique tokens for concurrent requests', async () => {
      const [result1, result2] = await Promise.all([
        JwtService.generateTokenPair(testUserId, testEmail),
        JwtService.generateTokenPair(testUserId, testEmail)
      ]);

      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });

    it('should handle invalid user data', async () => {
      await expect(
        JwtService.generateTokenPair('', testEmail)
      ).rejects.toThrow();

      await expect(
        JwtService.generateTokenPair(testUserId, '')
      ).rejects.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockResolvedValue(null); // Not blacklisted

      const result = await JwtService.verifyAccessToken(accessToken);

      expect(result.userId).toBe(testUserId);
      expect(result.email).toBe(testEmail);
      expect(result.type).toBe('access');
    });

    it('should reject blacklisted token', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockResolvedValue('1'); // Blacklisted

      await expect(
        JwtService.verifyAccessToken(accessToken)
      ).rejects.toThrow('Token is blacklisted');
    });

    it('should reject invalid token', async () => {
      await expect(
        JwtService.verifyAccessToken('invalid-token')
      ).rejects.toThrow();
    });

    it('should reject refresh token as access token', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockResolvedValue(null);

      await expect(
        JwtService.verifyAccessToken(refreshToken)
      ).rejects.toThrow('Invalid token type');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockImplementation((key) => {
        if (key === `blacklist:${refreshToken}`) return Promise.resolve(null);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(refreshToken);
        return Promise.resolve(null);
      });

      const result = await JwtService.verifyRefreshToken(refreshToken);

      expect(result.userId).toBe(testUserId);
      expect(result.email).toBe(testEmail);
      expect(result.type).toBe('refresh');
    });

    it('should reject blacklisted refresh token', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockResolvedValue('1'); // Blacklisted

      await expect(
        JwtService.verifyRefreshToken(refreshToken)
      ).rejects.toThrow('Token is blacklisted');
    });

    it('should reject token not in Redis', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockImplementation((key) => {
        if (key === `blacklist:${refreshToken}`) return Promise.resolve(null);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(null); // Not stored
        return Promise.resolve(null);
      });

      await expect(
        JwtService.verifyRefreshToken(refreshToken)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockImplementation((key) => {
        if (key === `blacklist:${refreshToken}`) return Promise.resolve(null);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(refreshToken);
        return Promise.resolve(null);
      });

      const result = await JwtService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('accessTokenExpiry');

      const payload = jwt.decode(result.accessToken) as JwtPayload;
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
      expect(payload.type).toBe('access');
    });

    it('should update access token in Redis', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockImplementation((key) => {
        if (key === `blacklist:${refreshToken}`) return Promise.resolve(null);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(refreshToken);
        return Promise.resolve(null);
      });

      await JwtService.refreshAccessToken(refreshToken);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `access_token:${testUserId}`,
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist valid token', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);

      await JwtService.blacklistToken(accessToken);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `blacklist:${accessToken}`,
        expect.any(Number),
        '1'
      );
    });

    it('should handle expired token gracefully', async () => {
      // Create an already expired token
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail, type: 'access' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1s' }
      );

      // Should not throw error, just not blacklist expired token
      await expect(JwtService.blacklistToken(expiredToken)).resolves.not.toThrow();
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';
      const sessions = ['session1', 'session2'];

      mockRedis.get.mockImplementation((key) => {
        if (key === `access_token:${testUserId}`) return Promise.resolve(accessToken);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(refreshToken);
        return Promise.resolve(null);
      });
      mockRedis.smembers.mockResolvedValue(sessions);

      await JwtService.revokeAllUserSessions(testUserId);

      expect(mockRedis.del).toHaveBeenCalledWith(`access_token:${testUserId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${testUserId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`user_sessions:${testUserId}`);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const authHeader = `Bearer ${token}`;

      const result = JwtService.extractTokenFromHeader(authHeader);

      expect(result).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const result = JwtService.extractTokenFromHeader('Invalid header');
      expect(result).toBeNull();
    });

    it('should return null for undefined header', () => {
      const result = JwtService.extractTokenFromHeader(undefined);
      expect(result).toBeNull();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate password reset token', () => {
      const token = JwtService.generatePasswordResetToken(testUserId, testEmail);

      const payload = jwt.decode(token) as any;
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
      expect(payload.type).toBe('password-reset');
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify valid password reset token', () => {
      const token = JwtService.generatePasswordResetToken(testUserId, testEmail);

      const result = JwtService.verifyPasswordResetToken(token);

      expect(result.userId).toBe(testUserId);
      expect(result.email).toBe(testEmail);
    });

    it('should reject invalid token type', () => {
      const { accessToken } = jwt.sign(
        { userId: testUserId, email: testEmail, type: 'access' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      expect(() => {
        JwtService.verifyPasswordResetToken(accessToken as string);
      }).toThrow('Invalid token type');
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate email verification token', () => {
      const token = JwtService.generateEmailVerificationToken(testUserId, testEmail);

      const payload = jwt.decode(token) as any;
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
      expect(payload.type).toBe('email-verification');
    });
  });

  describe('verifyEmailVerificationToken', () => {
    it('should verify valid email verification token', () => {
      const token = JwtService.generateEmailVerificationToken(testUserId, testEmail);

      const result = JwtService.verifyEmailVerificationToken(token);

      expect(result.userId).toBe(testUserId);
      expect(result.email).toBe(testEmail);
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail, type: 'email-verification' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1s' }
      );

      expect(() => {
        JwtService.verifyEmailVerificationToken(expiredToken);
      }).toThrow('Invalid or expired email verification token');
    });
  });

  describe('getUserSessionsCount', () => {
    it('should return session count for user', async () => {
      mockRedis.scard.mockResolvedValue(3);

      const count = await JwtService.getUserSessionsCount(testUserId);

      expect(count).toBe(3);
      expect(mockRedis.scard).toHaveBeenCalledWith(`user_sessions:${testUserId}`);
    });

    it('should return 0 for user with no sessions', async () => {
      mockRedis.scard.mockResolvedValue(0);

      const count = await JwtService.getUserSessionsCount(testUserId);

      expect(count).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.scard.mockRejectedValue(new Error('Redis error'));

      const count = await JwtService.getUserSessionsCount(testUserId);

      expect(count).toBe(0);
    });
  });

  describe('Security Tests', () => {
    it('should not accept tokens with tampered payload', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      
      // Tamper with the token by changing the payload (this will invalidate the signature)
      const [header, payload, signature] = accessToken.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      decodedPayload.userId = 'hacker-id';
      const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      mockRedis.get.mockResolvedValue(null);

      await expect(
        JwtService.verifyAccessToken(tamperedToken)
      ).rejects.toThrow();
    });

    it('should not accept tokens with wrong signature', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      
      // Change the signature
      const [header, payload] = accessToken.split('.');
      const wrongSignature = 'wrong-signature';
      const tamperedToken = `${header}.${payload}.${wrongSignature}`;

      mockRedis.get.mockResolvedValue(null);

      await expect(
        JwtService.verifyAccessToken(tamperedToken)
      ).rejects.toThrow();
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        'not.a.token',
        'not-a-jwt',
        '',
        'a.b',
        'a.b.c.d.e'
      ];

      mockRedis.get.mockResolvedValue(null);

      for (const token of malformedTokens) {
        await expect(
          JwtService.verifyAccessToken(token)
        ).rejects.toThrow();
      }
    });

    it('should reject tokens signed with different secret', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: testUserId, email: testEmail, type: 'access' },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      mockRedis.get.mockResolvedValue(null);

      await expect(
        JwtService.verifyAccessToken(tokenWithWrongSecret)
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle token generation under load', async () => {
      const concurrentRequests = 50;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        JwtService.generateTokenPair(testUserId, testEmail)
      );

      const results = await Promise.all(promises);

      // All tokens should be unique
      const tokens = results.map(r => r.accessToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(concurrentRequests);
    });

    it('should handle token verification under load', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockResolvedValue(null);

      const concurrentRequests = 100;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        JwtService.verifyAccessToken(accessToken)
      );

      const results = await Promise.all(promises);

      // All verifications should succeed with same payload
      results.forEach(result => {
        expect(result.userId).toBe(testUserId);
        expect(result.email).toBe(testEmail);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle Redis connection failures during token generation', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Connection refused'));

      await expect(
        JwtService.generateTokenPair(testUserId, testEmail)
      ).rejects.toThrow('Token generation failed');
    });

    it('should handle Redis timeout during verification', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.get.mockRejectedValue(new Error('Timeout'));

      // Should default to allowing the token if Redis is down (fail open)
      const result = await JwtService.verifyAccessToken(accessToken);
      expect(result.userId).toBe(testUserId);
    });

    it('should handle token expiry edge cases', async () => {
      // Create a token that expires in 1 millisecond
      const shortLivedToken = jwt.sign(
        { userId: testUserId, email: testEmail, type: 'access' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      mockRedis.get.mockResolvedValue(null);

      await expect(
        JwtService.verifyAccessToken(shortLivedToken)
      ).rejects.toThrow('jwt expired');
    });

    it('should handle user sessions cleanup when Redis fails', async () => {
      mockRedis.get.mockResolvedValue('token');
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw error even if cleanup fails
      await expect(
        JwtService.revokeAllUserSessions(testUserId)
      ).resolves.not.toThrow();
    });

    it('should handle blacklist operation when Redis fails', async () => {
      const { accessToken } = await JwtService.generateTokenPair(testUserId, testEmail);
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      // Should throw error if blacklisting fails (this is critical for security)
      await expect(
        JwtService.blacklistToken(accessToken)
      ).rejects.toThrow('Failed to blacklist token');
    });
  });

  describe('Token Lifecycle', () => {
    it('should handle complete token lifecycle', async () => {
      // Generate tokens
      const tokens = await JwtService.generateTokenPair(testUserId, testEmail);
      
      // Verify tokens work
      mockRedis.get.mockResolvedValue(null);
      const accessPayload = await JwtService.verifyAccessToken(tokens.accessToken);
      expect(accessPayload.userId).toBe(testUserId);

      // Refresh access token
      mockRedis.get.mockImplementation((key) => {
        if (key === `blacklist:${tokens.refreshToken}`) return Promise.resolve(null);
        if (key === `refresh_token:${testUserId}`) return Promise.resolve(tokens.refreshToken);
        return Promise.resolve(null);
      });

      const newTokens = await JwtService.refreshAccessToken(tokens.refreshToken);
      expect(newTokens.accessToken).toBeDefined();

      // Blacklist tokens
      await JwtService.blacklistToken(tokens.accessToken);
      await JwtService.blacklistToken(newTokens.accessToken);

      // Verify blacklisted tokens are rejected
      mockRedis.get.mockResolvedValue('1');
      await expect(
        JwtService.verifyAccessToken(tokens.accessToken)
      ).rejects.toThrow('Token is blacklisted');
    });
  });
});