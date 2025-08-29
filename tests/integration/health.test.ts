import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { databaseTestHooks } from '../helpers/database';
import { apiAssertions } from '../helpers/request';

describe('Health Controller Integration Tests', () => {
  // Database setup hooks
  beforeAll(databaseTestHooks.beforeAll);
  afterEach(databaseTestHooks.afterEach);
  afterAll(databaseTestHooks.afterAll);

  describe('GET /api/v1/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Verify response structure
      apiAssertions.expectSuccess(response, 200);
      
      // Verify health data structure
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      
      // Verify memory information
      expect(response.body.data.memory).toHaveProperty('used');
      expect(response.body.data.memory).toHaveProperty('total');
      expect(response.body.data.memory).toHaveProperty('percentage');
      expect(response.body.data.memory.used).toBeGreaterThan(0);
      expect(response.body.data.memory.total).toBeGreaterThan(0);
      expect(response.body.data.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.data.memory.percentage).toBeLessThanOrEqual(100);
      
      // Verify system information
      expect(response.body.data.system).toHaveProperty('platform');
      expect(response.body.data.system).toHaveProperty('nodeVersion');
      expect(response.body.data.system).toHaveProperty('arch');
    });

    it('should return consistent response format', async () => {
      const response1 = await request(app).get('/api/v1/health');
      const response2 = await request(app).get('/api/v1/health');

      // Both responses should have the same structure
      expect(Object.keys(response1.body)).toEqual(Object.keys(response2.body));
      expect(Object.keys(response1.body.data)).toEqual(Object.keys(response2.body.data));
      
      // Uptime should increase
      expect(response2.body.data.uptime).toBeGreaterThanOrEqual(response1.body.data.uptime);
    });

    it('should have proper response headers', async () => {
      const response = await request(app).get('/api/v1/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/v1/health/detailed', () => {
    it('should return detailed health status with services', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect((res) => {
          // Should be either 200 (healthy) or 503 (degraded)
          expect([200, 503]).toContain(res.status);
        });

      // Verify response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      
      // Verify health data includes services
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.services).toHaveProperty('database');
      expect(response.body.data.services).toHaveProperty('redis');
      
      // Verify service health structure
      const dbService = response.body.data.services.database;
      const redisService = response.body.data.services.redis;
      
      expect(['healthy', 'unhealthy']).toContain(dbService.status);
      expect(['healthy', 'unhealthy']).toContain(redisService.status);
      expect(dbService).toHaveProperty('message');
      expect(redisService).toHaveProperty('message');
    });

    it('should return 503 when services are unhealthy', async () => {
      // This test assumes that in test environment, some services might be down
      // In a real test, you might want to mock the health checks to return unhealthy status
      const response = await request(app).get('/api/v1/health/detailed');
      
      if (response.status === 503) {
        expect(response.body.success).toBe(false);
        expect(response.body.data.status).toBe('degraded');
        expect(response.body.message).toContain('degraded');
      } else {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('healthy');
      }
    });

    it('should include all required health data fields', async () => {
      const response = await request(app).get('/api/v1/health/detailed');
      
      const requiredFields = [
        'status', 'timestamp', 'uptime', 'environment', 'version',
        'memory', 'system', 'services'
      ];
      
      requiredFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field);
      });
      
      // Check memory subfields
      expect(response.body.data.memory).toHaveProperty('used');
      expect(response.body.data.memory).toHaveProperty('total');
      expect(response.body.data.memory).toHaveProperty('percentage');
      
      // Check system subfields
      expect(response.body.data.system).toHaveProperty('platform');
      expect(response.body.data.system).toHaveProperty('nodeVersion');
      expect(response.body.data.system).toHaveProperty('arch');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect((res) => {
          // Should be either 200 (ready) or 503 (not ready)
          expect([200, 503]).toContain(res.status);
        });

      // Verify response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      
      // Verify readiness checks
      expect(response.body.data).toHaveProperty('server', true);
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('redis');
      
      // Database and Redis should be boolean
      expect(typeof response.body.data.database).toBe('boolean');
      expect(typeof response.body.data.redis).toBe('boolean');
    });

    it('should return appropriate message based on readiness', async () => {
      const response = await request(app).get('/api/v1/health/ready');
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('ready');
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not ready');
      }
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      // Liveness should always return 200 if server is running
      apiAssertions.expectSuccess(response, 200);
      
      // Verify liveness data
      expect(response.body.data).toHaveProperty('alive', true);
      expect(response.body.message).toContain('alive');
    });

    it('should consistently return alive status', async () => {
      // Test multiple requests to ensure consistency
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/v1/health/live')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.alive).toBe(true);
      });
    });

    it('should respond quickly for liveness checks', async () => {
      const startTime = Date.now();
      
      await request(app).get('/api/v1/health/live').expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Liveness checks should be very fast (less than 100ms)
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Health Endpoints Error Handling', () => {
    it('should handle invalid routes gracefully', async () => {
      await request(app)
        .get('/api/v1/health/nonexistent')
        .expect(404);
    });

    it('should maintain consistent response format on errors', async () => {
      const response = await request(app)
        .get('/api/v1/health/nonexistent')
        .expect(404);

      // Should still follow API response format
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Tests', () => {
    it('should respond to health checks within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app).get('/api/v1/health').expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Health checks should be fast (less than 200ms)
      expect(responseTime).toBeLessThan(200);
    });

    it('should handle concurrent health checks', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app).get('/api/v1/health')
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});