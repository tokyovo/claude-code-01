import bcrypt from 'bcrypt';

/**
 * User factory for generating test user data
 */
export class UserFactory {
  private static idCounter = 1;

  /**
   * Create a base user object
   */
  static create(overrides: Partial<any> = {}) {
    const id = this.idCounter++;
    const now = new Date().toISOString();

    return {
      id,
      email: `user${id}@example.com`,
      password_hash: bcrypt.hashSync('password123', 4), // Low rounds for testing
      first_name: 'Test',
      last_name: `User${id}`,
      phone: `+1234567890${id}`,
      date_of_birth: '1990-01-01',
      profile_picture_url: null,
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
      password_reset_token: null,
      password_reset_expires: null,
      last_login: now,
      login_attempts: 0,
      account_locked_until: null,
      preferences: {
        theme: 'light',
        currency: 'USD',
        notifications: {
          email: true,
          push: true,
          budget_alerts: true,
        },
      },
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create a user with admin privileges
   */
  static createAdmin(overrides: Partial<any> = {}) {
    return this.create({
      email: `admin${this.idCounter}@example.com`,
      first_name: 'Admin',
      role: 'admin',
      ...overrides,
    });
  }

  /**
   * Create an unverified user
   */
  static createUnverified(overrides: Partial<any> = {}) {
    return this.create({
      is_email_verified: false,
      email_verification_token: 'test-verification-token',
      email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    });
  }

  /**
   * Create a locked user account
   */
  static createLocked(overrides: Partial<any> = {}) {
    return this.create({
      login_attempts: 5,
      account_locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...overrides,
    });
  }

  /**
   * Create a user with password reset token
   */
  static createWithPasswordReset(overrides: Partial<any> = {}) {
    return this.create({
      password_reset_token: 'test-reset-token',
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...overrides,
    });
  }

  /**
   * Create multiple users
   */
  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create user for database insertion (without password_hash for API response)
   */
  static createForInsert(overrides: Partial<any> = {}) {
    const user = this.create(overrides);
    return user;
  }

  /**
   * Create user for API response (without sensitive data)
   */
  static createForResponse(overrides: Partial<any> = {}) {
    const user = this.create(overrides);
    const {
      password_hash,
      email_verification_token,
      email_verification_expires,
      password_reset_token,
      password_reset_expires,
      login_attempts,
      account_locked_until,
      ...safeUser
    } = user;
    
    return safeUser;
  }

  /**
   * Reset the ID counter (useful between tests)
   */
  static resetCounter() {
    this.idCounter = 1;
  }

  /**
   * Get raw password for testing authentication
   */
  static getRawPassword() {
    return 'password123';
  }

  /**
   * Hash password for testing
   */
  static async hashPassword(password: string) {
    return bcrypt.hash(password, 4);
  }
}

/**
 * User test scenarios
 */
export const userTestScenarios = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!',
    firstName: 'John',
    lastName: 'Doe',
  },
  
  invalidEmail: {
    email: 'invalid-email',
    password: 'ValidPassword123!',
    firstName: 'John',
    lastName: 'Doe',
  },
  
  weakPassword: {
    email: 'test@example.com',
    password: '123',
    firstName: 'John',
    lastName: 'Doe',
  },
  
  missingFields: {
    email: 'test@example.com',
    // Missing password, firstName, lastName
  },
  
  longFields: {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    firstName: 'A'.repeat(256), // Too long
    lastName: 'B'.repeat(256), // Too long
  },
};