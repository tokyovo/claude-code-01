import { Request, Response, NextFunction } from 'express';
import { AuthController, AuthenticatedRequest } from '../../../src/controllers/authController';
import { UserService } from '../../../src/services/userService';
import { JwtService } from '../../../src/services/jwtService';
import { EmailService } from '../../../src/services/emailService';
import { logger } from '../../../src/middleware/logging';
import { formatResponse } from '../../../src/utils/response';

// Mock dependencies
jest.mock('../../../src/services/userService');
jest.mock('../../../src/services/jwtService');
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/middleware/logging');
jest.mock('../../../src/utils/response');

const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockJwtService = JwtService as jest.Mocked<typeof JwtService>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockFormatResponse = formatResponse as jest.MockedFunction<typeof formatResponse>;

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockAuthenticatedRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  // Mock user data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    email_verified: false,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    last_login: new Date(),
    phone: '+1234567890',
    avatar_url: null,
    preferences: {}
  };

  const mockTokens = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    accessTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
    refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      body: {},
      headers: {},
      cookies: {},
      ip: '192.168.1.1',
      get: jest.fn()
    };

    mockAuthenticatedRequest = {
      ...mockRequest,
      user: {
        userId: 'user-123',
        email: 'test@example.com'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Setup default mock implementations
    mockFormatResponse.mockImplementation((data, message, success = true) => ({
      success,
      message,
      data
    }));

    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Test@123456',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890'
    };

    beforeEach(() => {
      mockRequest.body = validRegisterData;
    });

    it('should register a new user successfully', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockJwtService.generateEmailVerificationToken.mockReturnValue('verification-token');
      mockEmailService.sendWelcomeEmail.mockResolvedValue();

      await AuthController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.createUser).toHaveBeenCalledWith(validRegisterData);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name,
        'verification-token'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User registered successfully',
        { userId: mockUser.id, email: mockUser.email }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle user creation errors', async () => {
      const error = new Error('Email already exists');
      mockUserService.createUser.mockRejectedValue(error);

      await AuthController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Registration failed',
        { error: error.message, email: validRegisterData.email }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle email service failures gracefully', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockJwtService.generateEmailVerificationToken.mockReturnValue('verification-token');
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));

      await AuthController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User registered successfully',
        { userId: mockUser.id, email: mockUser.email }
      );
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Test@123456'
    };

    beforeEach(() => {
      mockRequest.body = validLoginData;
      mockRequest.ip = '192.168.1.1';
    });

    it('should login user successfully', async () => {
      const authenticateResult = {
        user: mockUser,
        tokens: mockTokens
      };

      const securityMetrics = {
        loginMetrics: {
          failedAttempts: 0,
          remainingAttempts: 5,
          accountLocked: false,
          lastFailedAttempt: null,
          lockoutExpiry: null
        },
        passwordResetMetrics: {
          failedAttempts: 0,
          remainingAttempts: 3,
          accountLocked: false,
          lastFailedAttempt: null,
          lockoutExpiry: null
        },
        recentAttempts: []
      };

      mockUserService.authenticateUser.mockResolvedValue(authenticateResult);
      mockUserService.getUserSecurityMetrics.mockResolvedValue(securityMetrics);

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith(validLoginData, mockRequest);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged in successfully',
        { 
          userId: mockUser.id, 
          email: mockUser.email,
          ipAddress: mockRequest.ip
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid credentials');
      mockUserService.authenticateUser.mockRejectedValue(error);

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Login failed',
        { 
          error: error.message, 
          email: validLoginData.email,
          ipAddress: mockRequest.ip 
        }
      );
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid email or password'
      }));
    });

    it('should handle account lockout errors', async () => {
      const error = new Error('Account locked. Try again in 15 minutes');
      mockUserService.authenticateUser.mockRejectedValue(error);

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Account locked. Try again in 15 minutes'
      }));
    });

    it('should handle suspended account errors', async () => {
      const error = new Error('Account is suspended');
      mockUserService.authenticateUser.mockRejectedValue(error);

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Account is suspended'
      }));
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const authenticateResult = {
        user: mockUser,
        tokens: mockTokens
      };

      mockUserService.authenticateUser.mockResolvedValue(authenticateResult);
      mockUserService.getUserSecurityMetrics.mockResolvedValue({
        loginMetrics: { failedAttempts: 0, remainingAttempts: 5, accountLocked: false, lastFailedAttempt: null, lockoutExpiry: null },
        passwordResetMetrics: { failedAttempts: 0, remainingAttempts: 3, accountLocked: false, lastFailedAttempt: null, lockoutExpiry: null },
        recentAttempts: []
      });

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('refresh', () => {
    it('should refresh access token successfully from cookie', async () => {
      mockRequest.cookies = { refreshToken: 'refresh-token-123' };
      
      const refreshResult = {
        accessToken: 'new-access-token',
        accessTokenExpiry: new Date()
      };

      mockJwtService.refreshAccessToken.mockResolvedValue(refreshResult);

      await AuthController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwtService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockFormatResponse).toHaveBeenCalledWith(
        refreshResult,
        'Token refreshed successfully'
      );
    });

    it('should refresh access token successfully from body', async () => {
      mockRequest.body = { refreshToken: 'refresh-token-123' };
      
      const refreshResult = {
        accessToken: 'new-access-token',
        accessTokenExpiry: new Date()
      };

      mockJwtService.refreshAccessToken.mockResolvedValue(refreshResult);

      await AuthController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwtService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing refresh token', async () => {
      await AuthController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Refresh token not provided'
      }));
    });

    it('should handle invalid refresh token', async () => {
      mockRequest.cookies = { refreshToken: 'invalid-token' };
      const error = new Error('Invalid refresh token');
      mockJwtService.refreshAccessToken.mockRejectedValue(error);

      await AuthController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Token refresh failed',
        { error: error.message }
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockAuthenticatedRequest.headers = {
        authorization: 'Bearer access-token-123'
      };
      mockAuthenticatedRequest.cookies = {
        refreshToken: 'refresh-token-123'
      };
    });

    it('should logout user successfully', async () => {
      mockJwtService.extractTokenFromHeader.mockReturnValue('access-token-123');
      mockJwtService.blacklistToken.mockResolvedValue();

      await AuthController.logout(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockJwtService.blacklistToken).toHaveBeenCalledWith('access-token-123');
      expect(mockJwtService.blacklistToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged out successfully',
        { userId: mockAuthenticatedRequest.user?.userId }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle logout errors', async () => {
      mockJwtService.extractTokenFromHeader.mockReturnValue('access-token-123');
      const error = new Error('Failed to blacklist token');
      mockJwtService.blacklistToken.mockRejectedValue(error);

      await AuthController.logout(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Logout failed',
        { error: error.message, userId: mockAuthenticatedRequest.user?.userId }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      mockUserService.findUserById.mockResolvedValue(mockUser);

      await AuthController.me(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.findUserById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockFormatResponse).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name
        })
      });
    });

    it('should handle unauthenticated request', async () => {
      const unauthenticatedRequest = { ...mockRequest, user: undefined };

      await AuthController.me(
        unauthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User not authenticated'
      }));
    });

    it('should handle user not found', async () => {
      mockUserService.findUserById.mockResolvedValue(null);

      await AuthController.me(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User not found'
      }));
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockRequest.body = { token: 'verification-token' };
      mockJwtService.verifyEmailVerificationToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com'
      });
      mockUserService.verifyEmail.mockResolvedValue();

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwtService.verifyEmailVerificationToken).toHaveBeenCalledWith('verification-token');
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith('user-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Email verified successfully',
        { userId: 'user-123', email: 'test@example.com' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing token', async () => {
      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Verification token is required'
      }));
    });

    it('should handle invalid token', async () => {
      mockRequest.body = { token: 'invalid-token' };
      const error = new Error('Invalid verification token');
      mockJwtService.verifyEmailVerificationToken.mockImplementation(() => {
        throw error;
      });

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Email verification failed',
        { error: error.message }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      mockRequest.body = { email: 'test@example.com' };
    });

    it('should handle password reset request for existing user', async () => {
      mockUserService.requestPasswordReset.mockResolvedValue();
      mockUserService.findUserByEmail.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue();

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.requestPasswordReset).toHaveBeenCalledWith('test@example.com', mockRequest);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name,
        mockUser.id
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockFormatResponse).toHaveBeenCalledWith(
        null,
        'If an account with that email exists, a password reset link has been sent'
      );
    });

    it('should handle password reset request for non-existent user', async () => {
      mockUserService.requestPasswordReset.mockResolvedValue();
      mockUserService.findUserByEmail.mockResolvedValue(null);

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.requestPasswordReset).toHaveBeenCalledWith('test@example.com', mockRequest);
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle email service failures gracefully', async () => {
      mockUserService.requestPasswordReset.mockResolvedValue();
      mockUserService.findUserByEmail.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send password reset email',
        expect.objectContaining({
          error: 'Email service down',
          userId: mockUser.id,
          email: mockUser.email
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle rate limiting errors', async () => {
      const error = new Error('Too many reset attempts. Try again in 1 hour');
      mockUserService.requestPasswordReset.mockRejectedValue(error);

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockFormatResponse).toHaveBeenCalledWith(null, error.message, false);
    });

    it('should handle missing email', async () => {
      mockRequest.body = {};

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Email is required'
      }));
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      mockRequest.body = {
        token: 'reset-token-123',
        password: 'NewPassword@123'
      };
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0 TestAgent');
    });

    it('should reset password successfully', async () => {
      mockJwtService.verifyPasswordResetToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com'
      });
      mockUserService.resetPassword.mockResolvedValue();
      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordChangeConfirmation.mockResolvedValue();

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwtService.verifyPasswordResetToken).toHaveBeenCalledWith('reset-token-123');
      expect(mockUserService.resetPassword).toHaveBeenCalledWith('user-123', 'NewPassword@123');
      expect(mockEmailService.sendPasswordChangeConfirmation).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Password reset successfully',
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing token or password', async () => {
      mockRequest.body = { token: 'reset-token-123' };

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Token and new password are required'
      }));
    });

    it('should handle invalid reset token', async () => {
      const error = new Error('Invalid or expired reset token');
      mockJwtService.verifyPasswordResetToken.mockImplementation(() => {
        throw error;
      });

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Password reset link is invalid or has expired. Please request a new one.'
      }));
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      mockAuthenticatedRequest.body = {
        currentPassword: 'CurrentPassword@123',
        newPassword: 'NewPassword@123'
      };
    });

    it('should change password successfully', async () => {
      mockUserService.changePassword.mockResolvedValue();
      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordChangeConfirmation.mockResolvedValue();

      await AuthController.changePassword(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'user-123',
        'CurrentPassword@123',
        'NewPassword@123'
      );
      expect(mockEmailService.sendPasswordChangeConfirmation).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing parameters', async () => {
      mockAuthenticatedRequest.body = { currentPassword: 'test' };

      await AuthController.changePassword(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Current password and new password are required'
      }));
    });

    it('should handle unauthenticated request', async () => {
      const unauthenticatedRequest = { ...mockRequest, user: undefined };

      await AuthController.changePassword(
        unauthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User not authenticated'
      }));
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockAuthenticatedRequest.body = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+1987654321'
      };
    });

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, first_name: 'Updated', last_name: 'Name' };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      await AuthController.updateProfile(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-123', {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+1987654321'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User profile updated',
        { userId: 'user-123' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle unauthenticated request', async () => {
      const unauthenticatedRequest = { ...mockRequest, user: undefined };

      await AuthController.updateProfile(
        unauthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User not authenticated'
      }));
    });
  });

  describe('getSecurityInfo', () => {
    it('should return security information for authenticated user', async () => {
      const securityMetrics = {
        loginMetrics: {
          failedAttempts: 2,
          remainingAttempts: 3,
          accountLocked: false,
          lastFailedAttempt: new Date(),
          lockoutExpiry: null
        },
        passwordResetMetrics: {
          failedAttempts: 0,
          remainingAttempts: 3,
          accountLocked: false,
          lastFailedAttempt: null,
          lockoutExpiry: null
        },
        recentAttempts: [
          {
            id: 1,
            attemptType: 'login',
            successful: false,
            ipAddress: '192.168.1.1',
            userAgent: 'TestAgent',
            attemptedAt: new Date()
          }
        ]
      };

      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockUserService.getUserSecurityMetrics.mockResolvedValue(securityMetrics);

      await AuthController.getSecurityInfo(
        mockAuthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserSecurityMetrics).toHaveBeenCalledWith(mockUser.email);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockFormatResponse).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
        security: expect.objectContaining({
          loginAttempts: expect.objectContaining({
            failed: 2,
            remaining: 3,
            locked: false
          }),
          passwordResetAttempts: expect.objectContaining({
            failed: 0,
            remaining: 3,
            locked: false
          })
        })
      });
    });

    it('should handle unauthenticated request', async () => {
      const unauthenticatedRequest = { ...mockRequest, user: undefined };

      await AuthController.getSecurityInfo(
        unauthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User not authenticated'
      }));
    });
  });
});