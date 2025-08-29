import { z } from 'zod';

/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * Core User Interface - matches database schema
 */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  status: UserStatus;
  email_verified: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  phone?: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, any> | null;
}

/**
 * User without sensitive information (for API responses)
 */
export interface UserSafe extends Omit<User, 'password_hash'> {}

/**
 * User creation data interface
 */
export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

/**
 * User update data interface
 */
export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, any> | null;
}

/**
 * User login credentials
 */
export interface UserLoginData {
  email: string;
  password: string;
}

/**
 * User authentication result
 */
export interface UserAuthResult {
  user: UserSafe;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: Date;
  };
}

/**
 * User session information
 */
export interface UserSession {
  userId: string;
  email: string;
  activeSessions: number;
  currentSession: {
    authenticated: boolean;
    loginTime: Date;
  };
}

/**
 * Password change data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password reset data
 */
export interface PasswordResetData {
  token: string;
  password: string;
}

/**
 * Zod schemas for validation
 */

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must be less than 254 characters')
  .transform(email => email.toLowerCase().trim());

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, 'Password must contain at least one special character')
  .refine(password => !password.toLowerCase().includes('password'), 'Password cannot contain the word "password"')
  .refine(password => !/123456|abcdef|qwerty/i.test(password), 'Password cannot contain common sequential patterns');

// Name validation schema
export const nameSchema = z
  .string()
  .min(1, 'Name cannot be empty')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(name => name.trim());

// Phone validation schema
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in valid international format')
  .optional()
  .nullable()
  .transform(phone => phone === '' ? null : phone);

// Avatar URL validation schema
export const avatarUrlSchema = z
  .string()
  .url('Avatar URL must be a valid URL')
  .max(500, 'Avatar URL must be less than 500 characters')
  .optional()
  .nullable();

// User preferences validation schema
export const preferencesSchema = z
  .record(z.unknown())
  .optional()
  .nullable();

// User creation validation schema
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  phone: z.string().optional().nullable().transform(val => {
    // Handle empty strings and undefined
    if (!val || val.trim() === '') return null;
    // Basic validation for international phone format
    if (!/^\+?[1-9][0-9]{7,14}$/.test(val)) {
      throw new Error('Phone number must be in valid international format');
    }
    return val;
  }),
});

// User update validation schema
export const updateUserSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema,
  avatar_url: avatarUrlSchema,
  preferences: preferencesSchema,
}).partial();

// User login validation schema
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128, 'Current password is too long'),
  newPassword: passwordSchema,
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// Password reset validation schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required').max(500, 'Invalid token format'),
  password: passwordSchema,
});

/**
 * User model utility functions
 */
export class UserModel {
  /**
   * Remove sensitive data from user object
   */
  static toSafe(user: User): UserSafe {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user display name
   */
  static getDisplayName(user: UserSafe): string {
    return `${user.first_name} ${user.last_name}`.trim();
  }

  /**
   * Get user initials
   */
  static getInitials(user: UserSafe): string {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  }

  /**
   * Check if user account is active
   */
  static isActive(user: UserSafe): boolean {
    return user.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user email is verified
   */
  static isEmailVerified(user: UserSafe): boolean {
    return user.email_verified;
  }

  /**
   * Check if user account is suspended
   */
  static isSuspended(user: UserSafe): boolean {
    return user.status === UserStatus.SUSPENDED;
  }

  /**
   * Get user age in days since creation
   */
  static getAccountAge(user: UserSafe): number {
    const now = new Date();
    const created = new Date(user.created_at);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get last login info
   */
  static getLastLoginInfo(user: UserSafe): { lastLogin: Date | null; daysSinceLogin: number | null } {
    if (!user.last_login) {
      return { lastLogin: null, daysSinceLogin: null };
    }

    const now = new Date();
    const lastLogin = new Date(user.last_login);
    const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    return { lastLogin, daysSinceLogin };
  }

  /**
   * Validate user creation data
   */
  static validateCreateData(data: unknown): CreateUserData {
    return createUserSchema.parse(data);
  }

  /**
   * Validate user update data
   */
  static validateUpdateData(data: unknown): UpdateUserData {
    return updateUserSchema.parse(data);
  }

  /**
   * Validate login data
   */
  static validateLoginData(data: unknown): UserLoginData {
    return loginUserSchema.parse(data);
  }

  /**
   * Validate password change data
   */
  static validatePasswordChangeData(data: unknown): PasswordChangeData {
    return passwordChangeSchema.parse(data);
  }

  /**
   * Validate password reset data
   */
  static validatePasswordResetData(data: unknown): PasswordResetData {
    return passwordResetSchema.parse(data);
  }
}

/**
 * Type guards for user-related data
 */
export const isValidEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const isValidPassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

export const isUserSafe = (user: any): user is UserSafe => {
  return (
    user &&
    typeof user === 'object' &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.first_name === 'string' &&
    typeof user.last_name === 'string' &&
    Object.values(UserStatus).includes(user.status) &&
    typeof user.email_verified === 'boolean' &&
    !('password_hash' in user)
  );
};

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES = {
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  notifications: {
    email: true,
    push: true,
    budget_alerts: true,
    transaction_alerts: true,
  },
  privacy: {
    profile_visibility: 'private',
    data_sharing: false,
  },
} as const;

/**
 * User-related constants
 */
export const USER_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,
  MAX_AVATAR_URL_LENGTH: 500,
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME_MS: 15 * 60 * 1000, // 15 minutes
  EMAIL_VERIFICATION_TOKEN_EXPIRY: '24h',
  PASSWORD_RESET_TOKEN_EXPIRY: '1h',
} as const;

export default UserModel;