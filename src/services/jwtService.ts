import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { redisClient } from '../config/redis';
import { logger } from '../middleware/logging';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: Date;
  refreshTokenExpiry: Date;
}

export class JwtService {
  private static readonly ACCESS_TOKEN_PREFIX = 'access_token:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private static readonly BLACKLIST_PREFIX = 'blacklist:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    try {
      const accessTokenExpiry = new Date(Date.now() + this.parseExpiry(config.JWT_EXPIRES_IN));
      const refreshTokenExpiry = new Date(Date.now() + this.parseExpiry(config.JWT_REFRESH_EXPIRES_IN));

      const accessPayload: JwtPayload = {
        userId,
        email,
        type: 'access'
      };

      const refreshPayload: JwtPayload = {
        userId,
        email,
        type: 'refresh'
      };

      const accessToken = jwt.sign(accessPayload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
        issuer: 'finance-tracker-api',
        audience: 'finance-tracker-app'
      } as jwt.SignOptions);

      const refreshToken = jwt.sign(refreshPayload, config.JWT_REFRESH_SECRET, {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
        issuer: 'finance-tracker-api',
        audience: 'finance-tracker-app'
      } as jwt.SignOptions);

      // Store tokens in Redis for session management
      await this.storeTokens(userId, accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry);

      logger.info('Token pair generated successfully', { userId, email });

      return {
        accessToken,
        refreshToken,
        accessTokenExpiry,
        refreshTokenExpiry
      };
    } catch (error) {
      logger.error('Failed to generate token pair', { error, userId, email });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify access token
   */
  static async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'finance-tracker-api',
        audience: 'finance-tracker-app'
      }) as JwtPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.warn('Access token verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: 'finance-tracker-api',
        audience: 'finance-tracker-app'
      }) as JwtPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verify token exists in Redis
      const storedToken = await redisClient.get(`${this.REFRESH_TOKEN_PREFIX}${decoded.userId}`);
      if (storedToken !== token) {
        throw new Error('Invalid refresh token');
      }

      return decoded;
    } catch (error) {
      logger.warn('Refresh token verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<Omit<TokenPair, 'refreshToken' | 'refreshTokenExpiry'>> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      const accessTokenExpiry = new Date(Date.now() + this.parseExpiry(config.JWT_EXPIRES_IN));

      const accessPayload: JwtPayload = {
        userId: decoded.userId,
        email: decoded.email,
        type: 'access'
      };

      const accessToken = jwt.sign(accessPayload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
        issuer: 'finance-tracker-api',
        audience: 'finance-tracker-app'
      });

      // Update access token in Redis
      await redisClient.setex(
        `${this.ACCESS_TOKEN_PREFIX}${decoded.userId}`,
        this.parseExpiry(config.JWT_EXPIRES_IN) / 1000,
        accessToken
      );

      logger.info('Access token refreshed successfully', { userId: decoded.userId });

      return {
        accessToken,
        accessTokenExpiry
      };
    } catch (error) {
      logger.error('Failed to refresh access token', { error });
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Blacklist a token
   */
  static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisClient.setex(`${this.BLACKLIST_PREFIX}${token}`, ttl, '1');
        logger.info('Token blacklisted successfully', { userId: decoded.userId, tokenType: decoded.type });
      }
    } catch (error) {
      logger.error('Failed to blacklist token', { error });
      throw new Error('Token blacklisting failed');
    }
  }

  /**
   * Check if token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisClient.get(`${this.BLACKLIST_PREFIX}${token}`);
      return result === '1';
    } catch (error) {
      logger.error('Failed to check token blacklist status', { error });
      return false;
    }
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all user tokens
      const accessTokenKey = `${this.ACCESS_TOKEN_PREFIX}${userId}`;
      const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

      const [accessToken, refreshToken, sessions] = await Promise.all([
        redisClient.get(accessTokenKey),
        redisClient.get(refreshTokenKey),
        redisClient.smembers(userSessionsKey)
      ]);

      // Blacklist current tokens
      const promises = [];
      if (accessToken) {
        promises.push(this.blacklistToken(accessToken));
      }
      if (refreshToken) {
        promises.push(this.blacklistToken(refreshToken));
      }

      // Blacklist all session tokens
      for (const sessionToken of sessions) {
        promises.push(this.blacklistToken(sessionToken));
      }

      await Promise.all(promises);

      // Clear user session data
      await Promise.all([
        redisClient.del(accessTokenKey),
        redisClient.del(refreshTokenKey),
        redisClient.del(userSessionsKey)
      ]);

      logger.info('All user sessions revoked successfully', { userId });
    } catch (error) {
      logger.error('Failed to revoke user sessions', { error, userId });
      throw new Error('Session revocation failed');
    }
  }

  /**
   * Get user active sessions count
   */
  static async getUserSessionsCount(userId: string): Promise<number> {
    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      return await redisClient.scard(userSessionsKey);
    } catch (error) {
      logger.error('Failed to get user sessions count', { error, userId });
      return 0;
    }
  }

  /**
   * Store tokens in Redis for session management
   */
  private static async storeTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry: Date,
    refreshTokenExpiry: Date
  ): Promise<void> {
    try {
      const accessTokenTtl = Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000);
      const refreshTokenTtl = Math.floor((refreshTokenExpiry.getTime() - Date.now()) / 1000);

      await Promise.all([
        // Store access token
        redisClient.setex(`${this.ACCESS_TOKEN_PREFIX}${userId}`, accessTokenTtl, accessToken),
        // Store refresh token
        redisClient.setex(`${this.REFRESH_TOKEN_PREFIX}${userId}`, refreshTokenTtl, refreshToken),
        // Add to user sessions set
        redisClient.sadd(`${this.USER_SESSIONS_PREFIX}${userId}`, accessToken, refreshToken),
        redisClient.expire(`${this.USER_SESSIONS_PREFIX}${userId}`, refreshTokenTtl)
      ]);
    } catch (error) {
      logger.error('Failed to store tokens in Redis', { error, userId });
      throw error;
    }
  }

  /**
   * Parse expiry string to milliseconds
   */
  private static parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid expiry format: ${expiry}`);
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'password-reset' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'email-verification' },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid token type');
      }
      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      throw new Error('Invalid or expired email verification token');
    }
  }
}