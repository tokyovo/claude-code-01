import { UserService, CreateUserData } from '../../../src/services/userService';
import { JwtService } from '../../../src/services/jwtService';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
    where: jest.fn(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    returning: jest.fn()
  }
}));

jest.mock('../../../src/services/jwtService');
jest.mock('bcrypt');
jest.mock('../../../src/middleware/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const mockDb = require('../../../src/config/database').db;
const mockJwtService = JwtService as jest.Mocked<typeof JwtService>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn()
  };

  const testUserData: CreateUserData = {
    email: 'test@example.com',
    password: 'Test@123456',
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890'
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    status: 'active',
    email_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
    phone: '+1234567890'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDb.transaction.mockResolvedValue(mockTransaction);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwtService.revokeAllUserSessions.mockResolvedValue();
  });

  describe('createUser', () => {
    beforeEach(() => {
      // Setup query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null), // No existing user
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser])
      };
      
      mockTransaction.mockImplementation(() => mockQueryBuilder);
    });

    it('should create a new user successfully', async () => {
      const result = await UserService.createUser(testUserData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(testUserData.password, 12);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should reject user with existing email', async () => {
      // Mock existing user
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);

      await expect(UserService.createUser(testUserData)).rejects.toThrow('already exists');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...testUserData,
        password: 'weak'
      };

      await expect(UserService.createUser(weakPasswordData)).rejects.toThrow('at least 8 characters');
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailData = {
        ...testUserData,
        email: 'TEST@EXAMPLE.COM'
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser])
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);

      await UserService.createUser(upperCaseEmailData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com'
        })
      );
    });
  });

  describe('authenticateUser', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Test@123456'
    };

    const mockUserWithPassword = {
      ...mockUser,
      password_hash: 'hashed-password'
    };

    beforeEach(() => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUserWithPassword)
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);
      
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiry: new Date(),
        refreshTokenExpiry: new Date()
      });
    });

    it('should authenticate user successfully', async () => {
      const result = await UserService.authenticateUser(loginData);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUserWithPassword.password_hash
      );
      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email
      );
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.tokens).toBeDefined();
    });

    it('should reject authentication for non-existent user', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);

      await expect(UserService.authenticateUser(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject authentication for inactive user', async () => {
      const inactiveUser = { ...mockUserWithPassword, status: 'suspended' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(inactiveUser)
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);

      await expect(UserService.authenticateUser(loginData)).rejects.toThrow('inactive or suspended');
    });

    it('should reject authentication for wrong password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(UserService.authenticateUser(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      mockDb.mockImplementation(() => mockQueryBuilder);

      const result = await UserService.findUserById('user-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'user-123' });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
      mockDb.mockImplementation(() => mockQueryBuilder);

      const result = await UserService.findUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      mockDb.mockImplementation(() => mockQueryBuilder);

      const result = await UserService.findUserByEmail('test@example.com');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ 
        email: 'test@example.com' 
      });
      expect(result).toEqual(mockUser);
    });

    it('should normalize email case', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      mockDb.mockImplementation(() => mockQueryBuilder);

      await UserService.findUserByEmail('TEST@EXAMPLE.COM');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ 
        email: 'test@example.com' 
      });
    });
  });

  describe('updateUser', () => {
    const updateData = {
      first_name: 'Updated',
      last_name: 'Name'
    };

    beforeEach(() => {
      // Mock finding existing user
      const mockSelectBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      mockDb.mockImplementation(() => mockSelectBuilder);

      // Mock update operation
      const mockUpdateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockUser, ...updateData }])
      };
      mockTransaction.mockImplementation(() => mockUpdateBuilder);
    });

    it('should update user successfully', async () => {
      const result = await UserService.updateUser('user-123', updateData);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.first_name).toBe(updateData.first_name);
      expect(result.last_name).toBe(updateData.last_name);
    });

    it('should reject update for non-existent user', async () => {
      const mockSelectBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
      mockDb.mockImplementation(() => mockSelectBuilder);

      await expect(
        UserService.updateUser('non-existent', updateData)
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const currentPassword = 'Current@123';
    const newPassword = 'New@123456';

    beforeEach(() => {
      const mockUserWithHash = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed-current-password'
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUserWithHash),
        update: jest.fn().mockReturnThis()
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);
    });

    it('should change password successfully', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      await UserService.changePassword(userId, currentPassword, newPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        currentPassword,
        'hashed-current-password'
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockJwtService.revokeAllUserSessions).toHaveBeenCalledWith(userId);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should reject change with incorrect current password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        UserService.changePassword(userId, 'wrong-password', newPassword)
      ).rejects.toThrow('Current password is incorrect');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate new password strength', async () => {
      await expect(
        UserService.changePassword(userId, currentPassword, 'weak')
      ).rejects.toThrow('at least 8 characters');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      };
      mockDb.mockImplementation(() => mockQueryBuilder);

      await UserService.verifyEmail('user-123');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        email_verified: true,
        updated_at: expect.any(Date)
      });
    });
  });

  describe('suspendUser', () => {
    beforeEach(() => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      };
      mockTransaction.mockImplementation(() => mockQueryBuilder);
    });

    it('should suspend user successfully', async () => {
      await UserService.suspendUser('user-123');

      expect(mockJwtService.revokeAllUserSessions).toHaveBeenCalledWith('user-123');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      // This is tested indirectly through createUser and changePassword
      expect(() => {
        (UserService as any).validatePassword('Strong@Password123');
      }).not.toThrow();
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'Contains password',
        'Sequential123456!'
      ];

      weakPasswords.forEach(password => {
        expect(() => {
          (UserService as any).validatePassword(password);
        }).toThrow();
      });
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct rounds', async () => {
      await (UserService as any).hashPassword('test-password');

      expect(mockBcrypt.hash).toHaveBeenCalledWith('test-password', 12);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await (UserService as any).verifyPassword('password', 'hash');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', 'hash');
      expect(result).toBe(true);
    });

    it('should handle bcrypt errors gracefully', async () => {
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      const result = await (UserService as any).verifyPassword('password', 'hash');

      expect(result).toBe(false);
    });
  });
});