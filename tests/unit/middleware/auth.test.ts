import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AuthTestHelper } from '../../helpers/auth';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/env');

// Import after mocking
import * as jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../../../src/middleware/auth';

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock response
    mockResponse = AuthTestHelper.createMockResponse();
    mockNext = AuthTestHelper.createMockNext();
  });

  describe('authenticate middleware', () => {
    it('should authenticate user with valid token', async () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      const validToken = 'valid.jwt.token';
      
      mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };

      // Mock JWT verification to return user payload
      mockJwt.verify.mockReturnValue(testUser as any);

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify JWT was called with correct parameters
      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        process.env.JWT_SECRET || 'test_secret'
      );

      // Verify user is attached to request
      expect(mockRequest.user).toEqual(testUser);
      
      // Verify next() was called
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockRequest = {
        headers: {},
      };

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('No token provided'),
          }),
        })
      );

      // Verify next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      };

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid token format'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer expired.token',
        },
      };

      // Mock JWT verification to throw TokenExpiredError
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Token expired'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed token', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer malformed.token',
        },
      };

      // Mock JWT verification to throw JsonWebTokenError
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid token'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected JWT verification errors', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer some.token',
        },
      };

      // Mock JWT verification to throw unexpected error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Authentication failed'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with different authorization header cases', async () => {
      const testCases = [
        'Bearer token',
        'bearer token',
        'BEARER token',
      ];

      for (const authHeader of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockResponse = AuthTestHelper.createMockResponse();
        mockNext = AuthTestHelper.createMockNext();

        mockRequest = {
          headers: {
            authorization: authHeader,
          },
        };

        const testUser = { id: 1, email: 'test@example.com', role: 'user' };
        mockJwt.verify.mockReturnValue(testUser as any);

        await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockJwt.verify).toHaveBeenCalledWith('token', expect.any(String));
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      // Setup authenticated request
      mockRequest = {
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'user',
        },
      };
    });

    it('should authorize user with correct role', async () => {
      const authorizeMiddleware = authorize(['user', 'admin']);

      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should authorize admin for user-only endpoints', async () => {
      mockRequest.user!.role = 'admin';
      const authorizeMiddleware = authorize(['user']);

      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject user without required role', async () => {
      const authorizeMiddleware = authorize(['admin']);

      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Insufficient permissions'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without authenticated user', async () => {
      mockRequest.user = undefined;
      const authorizeMiddleware = authorize(['user']);

      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Authentication required'),
          }),
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty roles array', async () => {
      const authorizeMiddleware = authorize([]);

      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should allow access if no roles specified
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple role requirements', async () => {
      const testCases = [
        { userRole: 'user', allowedRoles: ['user', 'admin'], shouldAuthorize: true },
        { userRole: 'admin', allowedRoles: ['user', 'admin'], shouldAuthorize: true },
        { userRole: 'readonly', allowedRoles: ['user', 'admin'], shouldAuthorize: false },
        { userRole: 'moderator', allowedRoles: ['admin'], shouldAuthorize: false },
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockResponse = AuthTestHelper.createMockResponse();
        mockNext = AuthTestHelper.createMockNext();

        mockRequest.user!.role = testCase.userRole;
        const authorizeMiddleware = authorize(testCase.allowedRoles);

        await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        if (testCase.shouldAuthorize) {
          expect(mockNext).toHaveBeenCalled();
        } else {
          expect(mockResponse.status).toHaveBeenCalledWith(403);
          expect(mockNext).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Combined authentication and authorization flow', () => {
    it('should work together in middleware chain', async () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'admin' };
      mockRequest = {
        headers: {
          authorization: `Bearer ${AuthTestHelper.generateTestToken(testUser)}`,
        },
      };

      mockJwt.verify.mockReturnValue(testUser as any);

      // First authenticate
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockRequest.user).toEqual(testUser);

      // Reset next mock for authorization test
      jest.clearAllMocks();
      mockNext = AuthTestHelper.createMockNext();

      // Then authorize
      const authorizeMiddleware = authorize(['admin']);
      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail authorization after successful authentication', async () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      mockRequest = {
        headers: {
          authorization: `Bearer ${AuthTestHelper.generateTestToken(testUser)}`,
        },
      };

      mockJwt.verify.mockReturnValue(testUser as any);

      // First authenticate (should succeed)
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockRequest.user).toEqual(testUser);

      // Reset mocks for authorization test
      jest.clearAllMocks();
      mockResponse = AuthTestHelper.createMockResponse();
      mockNext = AuthTestHelper.createMockNext();

      // Then authorize (should fail)
      const authorizeMiddleware = authorize(['admin']);
      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});