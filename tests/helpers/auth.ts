import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * Authentication test helpers
 */
export class AuthTestHelper {
  /**
   * Generate a test JWT token
   */
  static generateTestToken(payload: any = {}, options: any = {}): string {
    const defaultPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      ...payload,
    };

    const defaultOptions = {
      expiresIn: '1h',
      ...options,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test_secret', defaultOptions);
  }

  /**
   * Generate an expired test token
   */
  static generateExpiredToken(payload: any = {}): string {
    const defaultPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      ...payload,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test_secret', {
      expiresIn: '-1h', // Expired 1 hour ago
    });
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: any = {}): string {
    const defaultPayload = {
      id: 1,
      email: 'test@example.com',
      type: 'refresh',
      ...payload,
    };

    return jwt.sign(
      defaultPayload,
      process.env.JWT_REFRESH_SECRET || 'test_refresh_secret',
      { expiresIn: '7d' }
    );
  }

  /**
   * Create mock authenticated request
   */
  static createAuthenticatedRequest(user: any = {}): Partial<Request> {
    const defaultUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      ...user,
    };

    return {
      user: defaultUser,
      headers: {
        authorization: `Bearer ${this.generateTestToken(defaultUser)}`,
      },
    };
  }

  /**
   * Create mock unauthenticated request
   */
  static createUnauthenticatedRequest(): Partial<Request> {
    return {
      headers: {},
    };
  }

  /**
   * Mock response object for testing middleware
   */
  static createMockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  }

  /**
   * Mock next function for testing middleware
   */
  static createMockNext(): NextFunction {
    return jest.fn();
  }

  /**
   * Test different authentication scenarios
   */
  static getAuthTestCases() {
    return {
      validToken: {
        description: 'valid token',
        token: this.generateTestToken(),
        expectAuth: true,
      },
      expiredToken: {
        description: 'expired token',
        token: this.generateExpiredToken(),
        expectAuth: false,
      },
      invalidToken: {
        description: 'invalid token',
        token: 'invalid.jwt.token',
        expectAuth: false,
      },
      noToken: {
        description: 'no token provided',
        token: null,
        expectAuth: false,
      },
      malformedToken: {
        description: 'malformed token',
        token: 'Bearer malformed.token',
        expectAuth: false,
      },
    };
  }
}

/**
 * User role test data
 */
export const userRoles = {
  admin: {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
  },
  user: {
    id: 2,
    email: 'user@example.com',
    role: 'user',
    permissions: ['read', 'write'],
  },
  readOnly: {
    id: 3,
    email: 'readonly@example.com',
    role: 'readonly',
    permissions: ['read'],
  },
};