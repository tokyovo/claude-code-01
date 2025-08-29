import request from 'supertest';
import { Express } from 'express';
import { AuthTestHelper } from './auth';

/**
 * API request test helpers
 */
export class RequestTestHelper {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Make authenticated GET request
   */
  async authenticatedGet(url: string, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .get(url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json');
  }

  /**
   * Make authenticated POST request
   */
  async authenticatedPost(url: string, data: any = {}, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .post(url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated PUT request
   */
  async authenticatedPut(url: string, data: any = {}, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .put(url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated PATCH request
   */
  async authenticatedPatch(url: string, data: any = {}, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .patch(url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated DELETE request
   */
  async authenticatedDelete(url: string, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .delete(url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json');
  }

  /**
   * Make unauthenticated GET request
   */
  async unauthenticatedGet(url: string) {
    return request(this.app)
      .get(url)
      .set('Content-Type', 'application/json');
  }

  /**
   * Make unauthenticated POST request
   */
  async unauthenticatedPost(url: string, data: any = {}) {
    return request(this.app)
      .post(url)
      .set('Content-Type', 'application/json')
      .send(data);
  }

  /**
   * Test file upload
   */
  async uploadFile(url: string, fieldName: string, filePath: string, user?: any, token?: string) {
    const authToken = token || AuthTestHelper.generateTestToken(user);
    
    return request(this.app)
      .post(url)
      .set('Authorization', `Bearer ${authToken}`)
      .attach(fieldName, filePath);
  }

  /**
   * Test multiple endpoints with different auth states
   */
  async testEndpointSecurity(url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: any) {
    const results = {
      unauthenticated: null as any,
      validToken: null as any,
      expiredToken: null as any,
      invalidToken: null as any,
    };

    // Test unauthenticated request
    switch (method) {
      case 'GET':
        results.unauthenticated = await this.unauthenticatedGet(url);
        break;
      case 'POST':
        results.unauthenticated = await this.unauthenticatedPost(url, data);
        break;
      // Add other methods as needed
    }

    // Test with valid token
    switch (method) {
      case 'GET':
        results.validToken = await this.authenticatedGet(url);
        break;
      case 'POST':
        results.validToken = await this.authenticatedPost(url, data);
        break;
      // Add other methods as needed
    }

    // Test with expired token
    const expiredToken = AuthTestHelper.generateExpiredToken();
    switch (method) {
      case 'GET':
        results.expiredToken = await this.authenticatedGet(url, undefined, expiredToken);
        break;
      case 'POST':
        results.expiredToken = await this.authenticatedPost(url, data, undefined, expiredToken);
        break;
      // Add other methods as needed
    }

    // Test with invalid token
    switch (method) {
      case 'GET':
        results.invalidToken = await this.authenticatedGet(url, undefined, 'invalid.token');
        break;
      case 'POST':
        results.invalidToken = await this.authenticatedPost(url, data, undefined, 'invalid.token');
        break;
      // Add other methods as needed
    }

    return results;
  }
}

/**
 * Common API response assertions
 */
export const apiAssertions = {
  /**
   * Assert successful response
   */
  expectSuccess: (response: any, statusCode: number = 200) => {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  },

  /**
   * Assert error response
   */
  expectError: (response: any, statusCode: number, message?: string) => {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    if (message) {
      expect(response.body.error.message).toContain(message);
    }
  },

  /**
   * Assert unauthorized response
   */
  expectUnauthorized: (response: any) => {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Unauthorized');
  },

  /**
   * Assert forbidden response
   */
  expectForbidden: (response: any) => {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Forbidden');
  },

  /**
   * Assert validation error response
   */
  expectValidationError: (response: any, fields?: string[]) => {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.type).toBe('ValidationError');
    if (fields) {
      fields.forEach(field => {
        expect(response.body.error.details).toHaveProperty(field);
      });
    }
  },

  /**
   * Assert paginated response
   */
  expectPaginatedResponse: (response: any, expectedFields: string[] = []) => {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('items');
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination).toHaveProperty('total');
    expect(response.body.data.pagination).toHaveProperty('page');
    expect(response.body.data.pagination).toHaveProperty('limit');
    
    if (expectedFields.length > 0 && response.body.data.items.length > 0) {
      expectedFields.forEach(field => {
        expect(response.body.data.items[0]).toHaveProperty(field);
      });
    }
  },
};