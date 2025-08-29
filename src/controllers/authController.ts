import { Request, Response, NextFunction } from 'express';
import { UserService, CreateUserData, UserLoginData } from '../services/userService';
import { JwtService } from '../services/jwtService';
import { EmailService } from '../services/emailService';
import { logger } from '../middleware/logging';
import { formatResponse } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserData = {
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        phone: req.body.phone
      };

      // Create user
      const user = await UserService.createUser(userData);

      // Send welcome and verification email
      await EmailService.sendWelcomeEmail(
        user.email,
        user.first_name,
        JwtService.generateEmailVerificationToken(user.id, user.email)
      );

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json(formatResponse({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified,
          created_at: user.created_at
        }
      }, 'User registered successfully. Please check your email to verify your account.'));
    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: req.body.email });
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: UserLoginData = {
        email: req.body.email,
        password: req.body.password
      };

      // Authenticate user
      const { user, tokens } = await UserService.authenticateUser(loginData);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.status(200).json(formatResponse({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified,
          last_login: user.last_login
        },
        tokens: {
          accessToken: tokens.accessToken,
          expiresAt: tokens.accessTokenExpiry
        }
      }, 'Login successful'));
    } catch (error) {
      logger.error('Login failed', { error: error.message, email: req.body.email });
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return next(new Error('Refresh token not provided'));
      }

      // Generate new access token
      const { accessToken, accessTokenExpiry } = await JwtService.refreshAccessToken(refreshToken);

      res.status(200).json(formatResponse({
        accessToken,
        expiresAt: accessTokenExpiry
      }, 'Token refreshed successfully'));
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      
      // Clear refresh token cookie on error
      res.clearCookie('refreshToken');
      
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = JwtService.extractTokenFromHeader(req.headers.authorization);
      const refreshToken = req.cookies.refreshToken;

      // Blacklist tokens
      const promises = [];
      if (accessToken) {
        promises.push(JwtService.blacklistToken(accessToken));
      }
      if (refreshToken) {
        promises.push(JwtService.blacklistToken(refreshToken));
      }

      await Promise.all(promises);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      logger.info('User logged out successfully', { userId: req.user?.userId });

      res.status(200).json(formatResponse(null, 'Logged out successfully'));
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      // Revoke all user sessions
      await JwtService.revokeAllUserSessions(req.user.userId);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      logger.info('User logged out from all devices', { userId: req.user.userId });

      res.status(200).json(formatResponse(null, 'Logged out from all devices successfully'));
    } catch (error) {
      logger.error('Logout all failed', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const user = await UserService.findUserById(req.user.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      res.status(200).json(formatResponse({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified,
          status: user.status,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at,
          phone: user.phone,
          avatar_url: user.avatar_url,
          preferences: user.preferences
        }
      }));
    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      
      if (!token) {
        return next(new Error('Verification token is required'));
      }

      // Verify token and get user info
      const { userId, email } = JwtService.verifyEmailVerificationToken(token);

      // Mark email as verified
      await UserService.verifyEmail(userId);

      logger.info('Email verified successfully', { userId, email });

      res.status(200).json(formatResponse(null, 'Email verified successfully'));
    } catch (error) {
      logger.error('Email verification failed', { error: error.message });
      next(error);
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const user = await UserService.findUserById(req.user.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.email_verified) {
        return res.status(400).json(formatResponse(null, 'Email is already verified', false));
      }

      // Send verification email
      await EmailService.sendEmailVerification(user.email, user.first_name, user.id);

      logger.info('Email verification resent', { userId: user.id, email: user.email });

      res.status(200).json(formatResponse(null, 'Verification email sent successfully'));
    } catch (error) {
      logger.error('Failed to resend email verification', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        return next(new Error('Email is required'));
      }

      // Find user by email
      const user = await UserService.findUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email });
        return res.status(200).json(formatResponse(null, 'If an account with that email exists, a password reset link has been sent'));
      }

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, user.first_name, user.id);

      logger.info('Password reset email sent', { userId: user.id, email: user.email });

      res.status(200).json(formatResponse(null, 'If an account with that email exists, a password reset link has been sent'));
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email: req.body.email });
      next(error);
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return next(new Error('Token and new password are required'));
      }

      // Verify reset token
      const { userId, email } = JwtService.verifyPasswordResetToken(token);

      // Reset password
      await UserService.resetPassword(userId, password);

      // Send confirmation email
      const user = await UserService.findUserById(userId);
      if (user) {
        await EmailService.sendPasswordChangeConfirmation(user.email, user.first_name);
      }

      logger.info('Password reset successfully', { userId, email });

      res.status(200).json(formatResponse(null, 'Password reset successfully'));
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      next(error);
    }
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return next(new Error('Current password and new password are required'));
      }

      // Change password
      await UserService.changePassword(req.user.userId, currentPassword, newPassword);

      // Send confirmation email
      const user = await UserService.findUserById(req.user.userId);
      if (user) {
        await EmailService.sendPasswordChangeConfirmation(user.email, user.first_name);
      }

      // Clear refresh token cookie to force re-authentication
      res.clearCookie('refreshToken');

      logger.info('Password changed successfully', { userId: req.user.userId });

      res.status(200).json(formatResponse(null, 'Password changed successfully. Please log in again.'));
    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const updateData = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        phone: req.body.phone,
        avatar_url: req.body.avatar_url,
        preferences: req.body.preferences
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedUser = await UserService.updateUser(req.user.userId, updateData);

      logger.info('User profile updated', { userId: req.user.userId });

      res.status(200).json(formatResponse({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          email_verified: updatedUser.email_verified,
          phone: updatedUser.phone,
          avatar_url: updatedUser.avatar_url,
          preferences: updatedUser.preferences,
          updated_at: updatedUser.updated_at
        }
      }, 'Profile updated successfully'));
    } catch (error) {
      logger.error('Profile update failed', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Get user session information
   */
  static async sessionInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const sessionsCount = await JwtService.getUserSessionsCount(req.user.userId);

      res.status(200).json(formatResponse({
        userId: req.user.userId,
        email: req.user.email,
        activeSessions: sessionsCount,
        currentSession: {
          authenticated: true,
          loginTime: new Date()
        }
      }));
    } catch (error) {
      logger.error('Failed to get session info', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }
}