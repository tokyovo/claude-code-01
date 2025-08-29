import bcrypt from 'bcrypt';
import { Request } from 'express';
import { Knex } from 'knex';
import { db } from '../config/database';
import { config } from '../config/env';
import { logger } from '../middleware/logging';
import { JwtService } from './jwtService';
import { SecurityService } from './securityService';
import { 
  User, 
  UserSafe, 
  CreateUserData, 
  UpdateUserData, 
  UserLoginData, 
  UserAuthResult,
  UserModel,
  UserStatus,
  USER_CONSTANTS,
  DEFAULT_USER_PREFERENCES
} from '../models/User';

// Type aliases for backwards compatibility
export type { User, UserSafe as UserWithoutPassword, CreateUserData, UpdateUserData, UserLoginData };

export class UserService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<UserSafe> {
    const trx = await db.transaction();
    
    try {
      // Validate input data using the User model
      const validatedData = UserModel.validateCreateData(userData);
      
      // Check if user already exists
      const existingUser = await this.findUserByEmail(validatedData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(validatedData.password);

      // Prepare user data with defaults
      const userToCreate = {
        email: validatedData.email,
        password_hash: hashedPassword,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        phone: validatedData.phone || null,
        status: UserStatus.ACTIVE,
        email_verified: false,
        preferences: DEFAULT_USER_PREFERENCES
      };

      // Create user
      const [user] = await trx('users')
        .insert(userToCreate)
        .returning([
          'id', 'email', 'first_name', 'last_name', 'status', 
          'email_verified', 'created_at', 'updated_at', 'phone', 
          'avatar_url', 'preferences', 'last_login'
        ]);

      await trx.commit();

      logger.info('User created successfully', { 
        userId: user.id, 
        email: user.email,
        hasPhone: !!user.phone 
      });
      
      return user;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to create user', { 
        error: error instanceof Error ? error.message : String(error), 
        email: userData.email 
      });
      throw error;
    }
  }

  /**
   * Authenticate user login with enhanced security
   */
  static async authenticateUser(loginData: UserLoginData, req?: Request): Promise<UserAuthResult> {
    const email = loginData.email.toLowerCase().trim();
    let securityInfo: any = {};
    
    if (req) {
      securityInfo = SecurityService.extractSecurityInfo(req);
    }

    try {
      // Validate login data
      const validatedData = UserModel.validateLoginData(loginData);
      
      // Check for account lockout
      const securityMetrics = await SecurityService.checkAccountLockout(email, 'login');
      
      if (securityMetrics.accountLocked) {
        const minutesRemaining = Math.ceil((securityMetrics.lockoutExpiry!.getTime() - Date.now()) / (1000 * 60));
        
        // Record the failed attempt due to lockout
        if (req) {
          await SecurityService.recordLoginAttempt({
            email,
            ipAddress: securityInfo.ipAddress || 'unknown',
            userAgent: securityInfo.userAgent,
            successful: false,
            attemptType: 'login',
            additionalInfo: {
              ...securityInfo.additionalInfo,
              reason: 'account_locked',
              lockoutExpiry: securityMetrics.lockoutExpiry?.toISOString()
            }
          });
        }

        throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining} minute(s).`);
      }

      // Find user with password hash
      const userWithPassword = await db('users')
        .where({ email })
        .first();

      if (!userWithPassword) {
        // Record failed attempt for non-existent user
        if (req) {
          await SecurityService.recordLoginAttempt({
            email,
            ipAddress: securityInfo.ipAddress || 'unknown',
            userAgent: securityInfo.userAgent,
            successful: false,
            attemptType: 'login',
            additionalInfo: {
              ...securityInfo.additionalInfo,
              reason: 'user_not_found'
            }
          });
        }
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      if (userWithPassword.status !== UserStatus.ACTIVE) {
        // Record failed attempt due to inactive account
        if (req) {
          await SecurityService.recordLoginAttempt({
            email,
            userId: userWithPassword.id,
            ipAddress: securityInfo.ipAddress || 'unknown',
            userAgent: securityInfo.userAgent,
            successful: false,
            attemptType: 'login',
            additionalInfo: {
              ...securityInfo.additionalInfo,
              reason: 'account_inactive',
              status: userWithPassword.status
            }
          });
        }

        if (userWithPassword.status === UserStatus.SUSPENDED) {
          throw new Error('Account has been suspended. Please contact support.');
        }
        throw new Error('Account is inactive');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(validatedData.password, userWithPassword.password_hash);
      if (!isValidPassword) {
        // Record failed attempt due to wrong password
        if (req) {
          await SecurityService.recordLoginAttempt({
            email,
            userId: userWithPassword.id,
            ipAddress: securityInfo.ipAddress || 'unknown',
            userAgent: securityInfo.userAgent,
            successful: false,
            attemptType: 'login',
            additionalInfo: {
              ...securityInfo.additionalInfo,
              reason: 'invalid_password'
            }
          });
        }
        throw new Error('Invalid credentials');
      }

      // Successful login - record it
      if (req) {
        await SecurityService.recordLoginAttempt({
          email,
          userId: userWithPassword.id,
          ipAddress: securityInfo.ipAddress || 'unknown',
          userAgent: securityInfo.userAgent,
          successful: true,
          attemptType: 'login',
          additionalInfo: securityInfo.additionalInfo
        });
      }

      // Reset failed login attempts (implicit - handled by SecurityService time window)
      await SecurityService.resetFailedAttempts(email, 'login');

      // Update last login
      await this.updateLastLogin(userWithPassword.id);

      // Generate tokens
      const tokens = await JwtService.generateTokenPair(userWithPassword.id, userWithPassword.email);

      // Remove password hash from user object
      const { password_hash, ...user } = userWithPassword;

      logger.info('User authenticated successfully', { 
        userId: user.id, 
        email: user.email,
        ipAddress: req ? securityInfo.ipAddress : 'unknown',
        remainingAttempts: securityMetrics.remainingAttempts
      });

      return { user, tokens };
    } catch (error) {
      logger.error('User authentication failed', { 
        error: error instanceof Error ? error.message : String(error), 
        email,
        ipAddress: req ? securityInfo.ipAddress : 'unknown'
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<UserSafe | null> {
    try {
      const user = await db('users')
        .select(['id', 'email', 'first_name', 'last_name', 'status', 'email_verified', 'last_login', 'created_at', 'updated_at', 'phone', 'avatar_url', 'preferences'])
        .where({ id })
        .first();

      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID', { error, userId: id });
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<UserSafe | null> {
    try {
      const user = await db('users')
        .select(['id', 'email', 'first_name', 'last_name', 'status', 'email_verified', 'last_login', 'created_at', 'updated_at', 'phone', 'avatar_url', 'preferences'])
        .where({ email: email.toLowerCase().trim() })
        .first();

      return user || null;
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updateData: UpdateUserData): Promise<UserSafe> {
    const trx = await db.transaction();

    try {
      // Validate user exists
      const existingUser = await this.findUserById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Update user
      const [updatedUser] = await trx('users')
        .where({ id: userId })
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'status', 'email_verified', 'last_login', 'created_at', 'updated_at', 'phone', 'avatar_url', 'preferences']);

      await trx.commit();

      logger.info('User updated successfully', { userId });
      return updatedUser;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to update user', { error, userId });
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const trx = await db.transaction();

    try {
      // Get user with current password hash
      const user = await trx('users')
        .select(['id', 'email', 'password_hash'])
        .where({ id: userId })
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      this.validatePassword(newPassword);

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await trx('users')
        .where({ id: userId })
        .update({
          password_hash: hashedNewPassword,
          updated_at: new Date()
        });

      await trx.commit();

      // Revoke all existing sessions to force re-authentication
      await JwtService.revokeAllUserSessions(userId);

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to change password', { error, userId });
      throw error;
    }
  }

  /**
   * Reset user password
   */
  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    const trx = await db.transaction();

    try {
      // Validate user exists
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate new password strength
      this.validatePassword(newPassword);

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await trx('users')
        .where({ id: userId })
        .update({
          password_hash: hashedPassword,
          updated_at: new Date()
        });

      await trx.commit();

      // Revoke all existing sessions
      await JwtService.revokeAllUserSessions(userId);

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to reset password', { error, userId });
      throw error;
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(userId: string): Promise<void> {
    try {
      await db('users')
        .where({ id: userId })
        .update({
          email_verified: true,
          updated_at: new Date()
        });

      logger.info('Email verified successfully', { userId });
    } catch (error) {
      logger.error('Failed to verify email', { error, userId });
      throw new Error('Email verification failed');
    }
  }

  /**
   * Suspend user account
   */
  static async suspendUser(userId: string): Promise<void> {
    const trx = await db.transaction();

    try {
      await trx('users')
        .where({ id: userId })
        .update({
          status: 'suspended',
          updated_at: new Date()
        });

      await trx.commit();

      // Revoke all user sessions
      await JwtService.revokeAllUserSessions(userId);

      logger.info('User suspended successfully', { userId });
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to suspend user', { error, userId });
      throw error;
    }
  }

  /**
   * Activate user account
   */
  static async activateUser(userId: string): Promise<void> {
    try {
      await db('users')
        .where({ id: userId })
        .update({
          status: 'active',
          updated_at: new Date()
        });

      logger.info('User activated successfully', { userId });
    } catch (error) {
      logger.error('Failed to activate user', { error, userId });
      throw error;
    }
  }

  /**
   * Delete user account (soft delete by deactivating)
   */
  static async deleteUser(userId: string): Promise<void> {
    const trx = await db.transaction();

    try {
      // Instead of hard delete, deactivate the account
      await trx('users')
        .where({ id: userId })
        .update({
          status: 'inactive',
          email: `deleted_${Date.now()}_${userId}`,
          updated_at: new Date()
        });

      await trx.commit();

      // Revoke all user sessions
      await JwtService.revokeAllUserSessions(userId);

      logger.info('User account deleted (deactivated)', { userId });
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to delete user account', { error, userId });
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   */
  private static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  private static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error });
      return false;
    }
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common patterns
    if (password.toLowerCase().includes('password')) {
      throw new Error('Password cannot contain the word "password"');
    }

    // Check for sequential characters
    if (/123456|abcdef|qwerty/i.test(password)) {
      throw new Error('Password cannot contain common sequential patterns');
    }
  }

  /**
   * Update user's last login timestamp
   */
  private static async updateLastLogin(userId: string): Promise<void> {
    try {
      await db('users')
        .where({ id: userId })
        .update({ last_login: new Date() });
    } catch (error) {
      logger.error('Failed to update last login', { error, userId });
      // Don't throw error as this is not critical for authentication
    }
  }

  /**
   * Add password reset tracking with enhanced security
   */
  static async requestPasswordReset(email: string, req?: Request): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    let securityInfo: any = {};
    
    if (req) {
      securityInfo = SecurityService.extractSecurityInfo(req);
    }

    try {
      // Check for password reset rate limiting
      const securityMetrics = await SecurityService.checkAccountLockout(normalizedEmail, 'password_reset');
      
      if (securityMetrics.accountLocked) {
        const minutesRemaining = Math.ceil((securityMetrics.lockoutExpiry!.getTime() - Date.now()) / (1000 * 60));
        
        // Record the failed attempt due to lockout
        if (req) {
          await SecurityService.recordLoginAttempt({
            email: normalizedEmail,
            ipAddress: securityInfo.ipAddress || 'unknown',
            userAgent: securityInfo.userAgent,
            successful: false,
            attemptType: 'password_reset',
            additionalInfo: {
              ...securityInfo.additionalInfo,
              reason: 'reset_rate_limited',
              lockoutExpiry: securityMetrics.lockoutExpiry?.toISOString()
            }
          });
        }
        
        throw new Error(`Too many password reset attempts. Try again in ${minutesRemaining} minute(s).`);
      }

      // Find user
      const user = await this.findUserByEmail(normalizedEmail);
      
      // Record the password reset attempt
      if (req) {
        await SecurityService.recordLoginAttempt({
          email: normalizedEmail,
          userId: user?.id,
          ipAddress: securityInfo.ipAddress || 'unknown',
          userAgent: securityInfo.userAgent,
          successful: !!user, // Successful if user exists
          attemptType: 'password_reset',
          additionalInfo: {
            ...securityInfo.additionalInfo,
            reason: user ? 'reset_requested' : 'user_not_found'
          }
        });
      }

      // Always log the request for security monitoring
      logger.info('Password reset requested', { 
        email: normalizedEmail,
        userExists: !!user,
        ipAddress: req ? securityInfo.ipAddress : 'unknown'
      });

    } catch (error) {
      logger.error('Password reset request failed', {
        error: error instanceof Error ? error.message : String(error),
        email: normalizedEmail,
        ipAddress: req ? securityInfo.ipAddress : 'unknown'
      });
      throw error;
    }
  }

  /**
   * Get user security metrics
   */
  static async getUserSecurityMetrics(email: string): Promise<any> {
    try {
      return await SecurityService.getSecurityMetrics(email.toLowerCase().trim());
    } catch (error) {
      logger.error('Failed to get user security metrics', {
        error: error instanceof Error ? error.message : String(error),
        email
      });
      throw new Error('Failed to retrieve security information');
    }
  }
}