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
   * Login user with enhanced security
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: UserLoginData = {
        email: req.body.email,
        password: req.body.password
      };

      // Authenticate user with security tracking
      const { user, tokens } = await UserService.authenticateUser(loginData, req);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Get remaining attempts info for response (optional security info)
      let securityInfo: any = {};
      try {
        const securityMetrics = await UserService.getUserSecurityMetrics(user.email);
        securityInfo = {
          remainingLoginAttempts: securityMetrics.loginMetrics.remainingAttempts
        };
      } catch {
        // Don't fail login if security metrics can't be retrieved
      }

      logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email,
        ipAddress: req.ip
      });

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
        },
        security: securityInfo
      }, 'Login successful'));
    } catch (error) {
      logger.error('Login failed', { 
        error: error.message, 
        email: req.body.email,
        ipAddress: req.ip 
      });
      
      // Provide user-friendly error messages
      let errorMessage = 'Login failed';
      if (error.message.includes('locked') || error.message.includes('Try again in')) {
        errorMessage = error.message;
      } else if (error.message.includes('suspended')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message.includes('inactive')) {
        errorMessage = 'Account is not active';
      }
      
      const customError = new Error(errorMessage);
      next(customError);
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
   * Request password reset with enhanced security tracking
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        return next(new Error('Email is required'));
      }

      // Use UserService for enhanced security tracking
      await UserService.requestPasswordReset(email, req);

      // Find user by email (for sending email if exists)
      const user = await UserService.findUserByEmail(email);
      
      // Send password reset email if user exists
      if (user) {
        try {
          await EmailService.sendPasswordResetEmail(user.email, user.first_name, user.id);
          logger.info('Password reset email sent', { 
            userId: user.id, 
            email: user.email,
            ipAddress: req.ip 
          });
        } catch (emailError) {
          logger.error('Failed to send password reset email', {
            error: emailError.message,
            userId: user.id,
            email: user.email,
            ipAddress: req.ip
          });
          // Don't reveal email sending failure to user
        }
      }

      // Always return success message to prevent email enumeration
      res.status(200).json(formatResponse(null, 'If an account with that email exists, a password reset link has been sent'));
    } catch (error) {
      logger.error('Password reset request failed', { 
        error: error.message, 
        email: req.body.email,
        ipAddress: req.ip 
      });

      // Handle rate limiting errors specifically
      if (error.message.includes('Try again in')) {
        return res.status(429).json(formatResponse(null, error.message, false));
      }

      next(error);
    }
  }

  /**
   * Reset password using token with enhanced security tracking
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

      // Record successful password reset
      const securityInfo = UserService.extractSecurityInfo ? 
        UserService.extractSecurityInfo(req) : 
        { ipAddress: req.ip || 'unknown', userAgent: req.get('User-Agent') };

      // Send confirmation email
      const user = await UserService.findUserById(userId);
      if (user) {
        try {
          await EmailService.sendPasswordChangeConfirmation(user.email, user.first_name);
        } catch (emailError) {
          logger.error('Failed to send password change confirmation', {
            error: emailError.message,
            userId,
            email,
            ipAddress: req.ip
          });
          // Don't fail the password reset if email fails
        }
      }

      logger.info('Password reset successfully', { 
        userId, 
        email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json(formatResponse(null, 'Password reset successfully. You can now log in with your new password.'));
    } catch (error) {
      logger.error('Password reset failed', { 
        error: error.message,
        ipAddress: req.ip
      });

      // Provide specific error messages for token issues
      let errorMessage = 'Password reset failed';
      if (error.message.includes('Invalid or expired')) {
        errorMessage = 'Password reset link is invalid or has expired. Please request a new one.';
      } else if (error.message.includes('Token')) {
        errorMessage = 'Invalid password reset token';
      } else if (error.message.includes('Password')) {
        errorMessage = error.message; // Keep password validation messages
      }

      const customError = new Error(errorMessage);
      next(customError);
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

  /**
   * Get user security information (authenticated users only)
   */
  static async getSecurityInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const user = await UserService.findUserById(req.user.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Get security metrics for the user
      const securityMetrics = await UserService.getUserSecurityMetrics(user.email);

      res.status(200).json(formatResponse({
        userId: req.user.userId,
        email: req.user.email,
        security: {
          loginAttempts: {
            failed: securityMetrics.loginMetrics.failedAttempts,
            remaining: securityMetrics.loginMetrics.remainingAttempts,
            locked: securityMetrics.loginMetrics.accountLocked,
            lockoutExpiry: securityMetrics.loginMetrics.lockoutExpiry
          },
          passwordResetAttempts: {
            failed: securityMetrics.passwordResetMetrics.failedAttempts,
            remaining: securityMetrics.passwordResetMetrics.remainingAttempts,
            locked: securityMetrics.passwordResetMetrics.accountLocked,
            lockoutExpiry: securityMetrics.passwordResetMetrics.lockoutExpiry
          },
          recentActivity: {
            totalAttempts: securityMetrics.recentAttempts.length,
            lastActivity: securityMetrics.recentAttempts[0]?.attemptedAt || null,
            uniqueIPs: [...new Set(securityMetrics.recentAttempts.map(a => a.ipAddress))].length
          }
        }
      }));
    } catch (error) {
      logger.error('Failed to get security info', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }
}