import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/request';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { UserService } from '../../src/services/userService';
import { JwtService } from '../../src/services/jwtService';
import { redisClient } from '../../src/config/redis';

describe('Authentication Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (redisClient.status === 'ready') {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      const existingUser = await UserService.findUserByEmail('test@example.com');
      if (existingUser) {
        await UserService.deleteUser(existingUser.id);
      }
    } catch (error) {
      // User doesn't exist, continue
    }
  });

  describe('POST /api/v1/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test@123456',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.first_name).toBe(validUserData.first_name);
      expect(response.body.data.user.last_name).toBe(validUserData.last_name);
      expect(response.body.data.user.email_verified).toBe(false);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          password: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('password');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('email');
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should sanitize input data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          first_name: '<script>alert("xss")</script>Test'
        })
        .expect(201);

      expect(response.body.data.user.first_name).not.toContain('<script>');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });
    });

    const validLoginData = {
      email: 'test@example.com',
      password: 'Test@123456'
    };

    it('should login user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe(validLoginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.expiresAt).toBeDefined();

      // Check that refresh token is set as HTTP-only cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test@123456'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login for suspended user', async () => {
      await UserService.suspendUser(testUser.id);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inactive');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });

      const tokens = await JwtService.generateTokenPair(testUser.id, testUser.email);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should accept refresh token in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
    });

    it('should reject refresh with no token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });

      const tokens = await JwtService.generateTokenPair(testUser.id, testUser.email);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // Check that refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => 
        cookie.includes('refreshToken=') && cookie.includes('Expires=')
      )).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });

      const tokens = await JwtService.generateTokenPair(testUser.id, testUser.email);
      accessToken = tokens.accessToken;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.first_name).toBe(testUser.first_name);
      expect(response.body.data.user.last_name).toBe(testUser.last_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('email');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });

      const tokens = await JwtService.generateTokenPair(testUser.id, testUser.email);
      accessToken = tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Test@123456',
          newPassword: 'NewTest@789'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify old token is invalidated by trying to use it
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should reject change with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewTest@789'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Test@123456',
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('newPassword');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });
    });

    it('should verify email successfully', async () => {
      const verificationToken = JwtService.generateEmailVerificationToken(
        testUser.id, 
        testUser.email
      );

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');

      // Verify that user's email is now verified
      const updatedUser = await UserService.findUserById(testUser.id);
      expect(updatedUser?.email_verified).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    beforeEach(async () => {
      testUser = await UserService.createUser({
        email: 'test@example.com',
        password: 'Test@123456',
        first_name: 'Test',
        last_name: 'User'
      });

      const tokens = await JwtService.generateTokenPair(testUser.id, testUser.email);
      accessToken = tokens.accessToken;
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+1987654321'
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.user.first_name).toBe(updateData.first_name);
      expect(response.body.data.user.last_name).toBe(updateData.last_name);
      expect(response.body.data.user.phone).toBe(updateData.phone);
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: 'invalid-phone' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('phone');
    });
  });
});