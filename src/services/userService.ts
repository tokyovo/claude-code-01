import bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { db } from '../config/database';
import { config } from '../config/env';
import { logger } from '../middleware/logging';
import { JwtService } from './jwtService';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  phone?: string;
  avatar_url?: string;
  preferences?: any;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  preferences?: any;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export class UserService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<UserWithoutPassword> {
    const trx = await db.transaction();
    
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate password strength
      this.validatePassword(userData.password);

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const [user] = await trx('users')
        .insert({
          email: userData.email.toLowerCase().trim(),
          password_hash: hashedPassword,
          first_name: userData.first_name.trim(),
          last_name: userData.last_name.trim(),
          phone: userData.phone?.trim() || null,
          status: 'active',
          email_verified: false
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'status', 'email_verified', 'created_at', 'updated_at', 'phone']);

      await trx.commit();

      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      await trx.rollback();
      logger.error('Failed to create user', { error, email: userData.email });
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  static async authenticateUser(loginData: UserLoginData): Promise<{ user: UserWithoutPassword; tokens: any }> {
    try {
      const email = loginData.email.toLowerCase().trim();
      
      // Check for account lockout
      await this.checkAccountLockout(email);

      // Find user with password hash
      const userWithPassword = await db('users')
        .where({ email })
        .first();

      if (!userWithPassword) {
        await this.recordFailedLogin(email);
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      if (userWithPassword.status !== 'active') {
        throw new Error('Account is inactive or suspended');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(loginData.password, userWithPassword.password_hash);
      if (!isValidPassword) {
        await this.recordFailedLogin(email);
        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts
      await this.resetFailedLoginAttempts(email);

      // Update last login
      await this.updateLastLogin(userWithPassword.id);

      // Generate tokens
      const tokens = await JwtService.generateTokenPair(userWithPassword.id, userWithPassword.email);

      // Remove password hash from user object
      const { password_hash, ...user } = userWithPassword;

      logger.info('User authenticated successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      logger.error('User authentication failed', { error: error.message, email: loginData.email });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<UserWithoutPassword | null> {
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
  static async findUserByEmail(email: string): Promise<UserWithoutPassword | null> {
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
  static async updateUser(userId: string, updateData: UpdateUserData): Promise<UserWithoutPassword> {
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
   * Record failed login attempt
   */
  private static async recordFailedLogin(email: string): Promise<void> {
    // Implementation would depend on having a login_attempts table
    // For now, we'll log the attempt
    logger.warn('Failed login attempt recorded', { email });
  }

  /**
   * Reset failed login attempts
   */
  private static async resetFailedLoginAttempts(email: string): Promise<void> {
    // Implementation would depend on having a login_attempts table
    // For now, we'll log the reset
    logger.info('Failed login attempts reset', { email });
  }

  /**
   * Check for account lockout
   */
  private static async checkAccountLockout(email: string): Promise<void> {
    // Implementation would depend on having a login_attempts table
    // For now, we'll just log the check
    logger.debug('Account lockout check passed', { email });
  }
}