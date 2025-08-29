import { performance } from 'perf_hooks';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/request';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { UserService } from '../../src/services/userService';
import { JwtService } from '../../src/services/jwtService';
import { SecurityService } from '../../src/services/securityService';
import { redisClient } from '../../src/config/redis';

describe('Authentication Performance Tests', () => {
  let app: Express;
  let testUsers: any[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    await setupTestDatabase();

    // Create test users for load testing
    console.log('Creating test users for performance testing...');
    const userPromises = [];
    for (let i = 0; i < 100; i++) {
      userPromises.push(
        UserService.createUser({
          email: `perf-test-${i}@example.com`,
          password: 'PerformanceTest@123',
          first_name: 'Performance',
          last_name: `Test${i}`
        })
      );
    }
    testUsers = await Promise.all(userPromises);
    console.log(`Created ${testUsers.length} test users`);
  });

  afterAll(async () => {
    // Cleanup test users
    console.log('Cleaning up test users...');
    const deletePromises = testUsers.map(user => UserService.deleteUser(user.id));
    await Promise.allSettled(deletePromises);
    
    await cleanupTestDatabase();
    if (redisClient.status === 'ready') {
      await redisClient.quit();
    }
  });

  describe('Login Performance', () => {
    it('should handle single login within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers[0].email,
          password: 'PerformanceTest@123'
        })
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
      
      console.log(`Single login completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent logins efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill(null).map((_, index) => {
        return request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUsers[index].email,
            password: 'PerformanceTest@123'
          });
      });

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Total time for concurrent requests should be reasonable
      expect(duration).toBeLessThan(3000); // Under 3 seconds for 20 concurrent logins
      
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms per request

      console.log(`${concurrentRequests} concurrent logins completed in ${duration.toFixed(2)}ms`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should handle high-frequency login attempts', async () => {
      const totalRequests = 100;
      const batchSize = 10;
      const results: { duration: number; success: boolean }[] = [];

      console.log(`Testing ${totalRequests} login requests in batches of ${batchSize}`);

      for (let i = 0; i < totalRequests; i += batchSize) {
        const batchPromises = [];
        
        for (let j = 0; j < batchSize && (i + j) < totalRequests; j++) {
          const userIndex = (i + j) % testUsers.length;
          const startTime = performance.now();
          
          const requestPromise = request(app)
            .post('/api/v1/auth/login')
            .send({
              email: testUsers[userIndex].email,
              password: 'PerformanceTest@123'
            })
            .then(response => {
              const endTime = performance.now();
              return {
                duration: endTime - startTime,
                success: response.status === 200,
                status: response.status
              };
            })
            .catch(error => ({
              duration: performance.now() - startTime,
              success: false,
              error: error.message
            }));

          batchPromises.push(requestPromise);
        }

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);
      
      const avgDuration = successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
      const maxDuration = Math.max(...successfulRequests.map(r => r.duration));
      const minDuration = Math.min(...successfulRequests.map(r => r.duration));

      console.log(`Performance Results:`);
      console.log(`- Successful requests: ${successfulRequests.length}/${totalRequests}`);
      console.log(`- Failed requests: ${failedRequests.length}`);
      console.log(`- Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`- Min duration: ${minDuration.toFixed(2)}ms`);
      console.log(`- Max duration: ${maxDuration.toFixed(2)}ms`);

      // Performance assertions
      expect(successfulRequests.length).toBeGreaterThan(totalRequests * 0.95); // At least 95% success
      expect(avgDuration).toBeLessThan(1000); // Average under 1 second
      expect(maxDuration).toBeLessThan(5000); // No request should take more than 5 seconds
    });
  });

  describe('Registration Performance', () => {
    it('should handle registration within acceptable time', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'perf-register-test@example.com',
          password: 'PerformanceTest@123',
          first_name: 'Performance',
          last_name: 'Register'
        })
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Registration can be slower than login

      console.log(`Registration completed in ${duration.toFixed(2)}ms`);

      // Cleanup
      await UserService.deleteUser(response.body.data.user.id);
    });

    it('should handle concurrent registrations', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill(null).map((_, index) => {
        return request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `perf-concurrent-${index}-${Date.now()}@example.com`,
            password: 'PerformanceTest@123',
            first_name: 'Performance',
            last_name: `Concurrent${index}`
          });
      });

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      const successfulRegistrations = responses.filter(r => r.status === 201);
      expect(successfulRegistrations.length).toBe(concurrentRequests);

      expect(duration).toBeLessThan(5000); // Under 5 seconds for 10 concurrent registrations

      console.log(`${concurrentRequests} concurrent registrations completed in ${duration.toFixed(2)}ms`);

      // Cleanup created users
      const cleanupPromises = responses.map(response => {
        if (response.status === 201) {
          return UserService.deleteUser(response.body.data.user.id);
        }
      });
      await Promise.allSettled(cleanupPromises);
    });
  });

  describe('Token Operations Performance', () => {
    let authTokens: { accessToken: string; refreshToken: string; userId: string }[] = [];

    beforeAll(async () => {
      // Generate tokens for testing
      console.log('Generating tokens for performance testing...');
      const tokenPromises = testUsers.slice(0, 50).map(user => 
        JwtService.generateTokenPair(user.id, user.email)
          .then(tokens => ({ ...tokens, userId: user.id }))
      );
      authTokens = await Promise.all(tokenPromises);
    });

    it('should verify tokens efficiently', async () => {
      const startTime = performance.now();
      
      const verificationPromises = authTokens.slice(0, 20).map(token => 
        JwtService.verifyAccessToken(token.accessToken)
      );

      const results = await Promise.all(verificationPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('email');
      });

      expect(duration).toBeLessThan(500); // Should verify 20 tokens in under 500ms

      console.log(`Verified 20 tokens in ${duration.toFixed(2)}ms`);
    });

    it('should handle token refresh efficiently', async () => {
      const startTime = performance.now();

      const refreshPromises = authTokens.slice(0, 10).map(token => 
        JwtService.refreshAccessToken(token.refreshToken)
      );

      const results = await Promise.all(refreshPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('accessTokenExpiry');
      });

      expect(duration).toBeLessThan(1000); // Should refresh 10 tokens in under 1 second

      console.log(`Refreshed 10 tokens in ${duration.toFixed(2)}ms`);
    });

    it('should handle token blacklisting efficiently', async () => {
      const tokensToBlacklist = authTokens.slice(0, 15);
      const startTime = performance.now();

      const blacklistPromises = tokensToBlacklist.map(token => 
        JwtService.blacklistToken(token.accessToken)
      );

      await Promise.all(blacklistPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should blacklist 15 tokens in under 1 second

      console.log(`Blacklisted 15 tokens in ${duration.toFixed(2)}ms`);

      // Verify tokens are actually blacklisted
      const verificationPromises = tokensToBlacklist.map(token => 
        JwtService.verifyAccessToken(token.accessToken).catch(error => error)
      );

      const verificationResults = await Promise.all(verificationPromises);
      verificationResults.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  describe('Security Operations Performance', () => {
    it('should record login attempts efficiently', async () => {
      const attempts = Array(50).fill(null).map((_, index) => ({
        email: `test${index}@example.com`,
        userId: testUsers[index % testUsers.length].id,
        ipAddress: `192.168.1.${index % 255}`,
        userAgent: 'Performance Test Agent',
        successful: Math.random() > 0.3, // 70% success rate
        attemptType: 'login' as const,
      }));

      const startTime = performance.now();

      const recordPromises = attempts.map(attempt => 
        SecurityService.recordLoginAttempt(attempt)
      );

      await Promise.all(recordPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should record 50 attempts in under 2 seconds

      console.log(`Recorded 50 login attempts in ${duration.toFixed(2)}ms`);
    });

    it('should check account lockouts efficiently', async () => {
      const emails = testUsers.slice(0, 20).map(user => user.email);
      const startTime = performance.now();

      const lockoutPromises = emails.map(email => 
        SecurityService.checkAccountLockout(email)
      );

      const results = await Promise.all(lockoutPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toHaveProperty('failedAttempts');
        expect(result).toHaveProperty('accountLocked');
        expect(result).toHaveProperty('remainingAttempts');
      });

      expect(duration).toBeLessThan(1000); // Should check 20 accounts in under 1 second

      console.log(`Checked lockout status for 20 accounts in ${duration.toFixed(2)}ms`);
    });

    it('should retrieve security metrics efficiently', async () => {
      const testEmail = testUsers[0].email;
      const startTime = performance.now();

      const metrics = await SecurityService.getSecurityMetrics(testEmail);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(metrics).toHaveProperty('loginMetrics');
      expect(metrics).toHaveProperty('passwordResetMetrics');
      expect(metrics).toHaveProperty('recentAttempts');

      expect(duration).toBeLessThan(500); // Should retrieve metrics in under 500ms

      console.log(`Retrieved security metrics in ${duration.toFixed(2)}ms`);
    });

    it('should generate security dashboard data efficiently', async () => {
      const startTime = performance.now();

      const dashboardData = await SecurityService.getSecurityDashboard();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(dashboardData).toHaveProperty('totalAttempts');
      expect(dashboardData).toHaveProperty('failedAttempts');
      expect(dashboardData).toHaveProperty('successfulAttempts');
      expect(dashboardData).toHaveProperty('uniqueUsers');
      expect(dashboardData).toHaveProperty('uniqueIPs');

      expect(duration).toBeLessThan(2000); // Should generate dashboard data in under 2 seconds

      console.log(`Generated security dashboard in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Database Performance', () => {
    it('should handle user queries efficiently', async () => {
      const userIds = testUsers.slice(0, 30).map(user => user.id);
      const startTime = performance.now();

      const queryPromises = userIds.map(id => 
        UserService.findUserById(id)
      );

      const results = await Promise.all(queryPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result).toHaveProperty('email');
      });

      expect(duration).toBeLessThan(1000); // Should query 30 users in under 1 second

      console.log(`Queried 30 users in ${duration.toFixed(2)}ms`);
    });

    it('should handle email lookups efficiently', async () => {
      const emails = testUsers.slice(0, 25).map(user => user.email);
      const startTime = performance.now();

      const queryPromises = emails.map(email => 
        UserService.findUserByEmail(email)
      );

      const results = await Promise.all(queryPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result).toHaveProperty('id');
      });

      expect(duration).toBeLessThan(1000); // Should query 25 emails in under 1 second

      console.log(`Queried 25 users by email in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const user = testUsers[i % testUsers.length];
        
        // Generate and immediately blacklist token
        const tokens = await JwtService.generateTokenPair(user.id, user.email);
        await JwtService.blacklistToken(tokens.accessToken);
        
        // Record security event
        await SecurityService.recordLoginAttempt({
          email: user.email,
          userId: user.id,
          ipAddress: '192.168.1.1',
          successful: true,
          attemptType: 'login',
        });

        // Periodic garbage collection hint
        if (i % 100 === 0) {
          global.gc && global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 50MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle connection pool efficiently', async () => {
      const concurrentConnections = 50;
      const startTime = performance.now();

      const connectionPromises = Array(concurrentConnections).fill(null).map(async (_, index) => {
        const user = testUsers[index % testUsers.length];
        
        // Perform database operation
        const foundUser = await UserService.findUserById(user.id);
        
        // Perform Redis operation
        const tokens = await JwtService.generateTokenPair(user.id, user.email);
        await JwtService.blacklistToken(tokens.accessToken);
        
        return foundUser;
      });

      const results = await Promise.all(connectionPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      results.forEach(result => {
        expect(result).toBeTruthy();
      });

      expect(duration).toBeLessThan(5000); // 50 concurrent operations in under 5 seconds

      console.log(`Handled ${concurrentConnections} concurrent connections in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should enforce rate limits without significant performance impact', async () => {
      const requests = 100;
      const startTime = performance.now();

      const requestPromises = Array(requests).fill(null).map((_, index) => {
        return request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com', // Use non-existent email
            password: 'wrong-password'
          })
          .then(response => ({
            status: response.status,
            duration: performance.now() - startTime
          }));
      });

      const responses = await Promise.all(requestPromises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const regularResponses = responses.filter(r => r.status !== 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0); // Should have some rate limited
      expect(totalDuration).toBeLessThan(10000); // Should complete in under 10 seconds

      console.log(`Rate limiting test: ${rateLimitedResponses.length} limited, ${regularResponses.length} regular`);
      console.log(`Completed ${requests} requests in ${totalDuration.toFixed(2)}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under stress', async () => {
      const stressTestDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const maxConcurrentRequests = 20;

      let activeRequests = 0;
      let completedRequests = 0;
      let failedRequests = 0;
      const responseTimes: number[] = [];

      const startTime = performance.now();
      const endTime = startTime + stressTestDuration;

      console.log(`Starting 30-second stress test...`);

      while (performance.now() < endTime) {
        if (activeRequests < maxConcurrentRequests) {
          activeRequests++;
          
          const requestStart = performance.now();
          const userIndex = completedRequests % testUsers.length;
          
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: testUsers[userIndex].email,
              password: 'PerformanceTest@123'
            })
            .then(response => {
              const requestEnd = performance.now();
              const duration = requestEnd - requestStart;
              
              responseTimes.push(duration);
              
              if (response.status === 200) {
                completedRequests++;
              } else {
                failedRequests++;
              }
              
              activeRequests--;
            })
            .catch(() => {
              failedRequests++;
              activeRequests--;
            });
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Wait for remaining requests to complete
      while (activeRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalRequests = completedRequests + failedRequests;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const requestsPerSecond = totalRequests / (stressTestDuration / 1000);

      console.log(`Stress test results:`);
      console.log(`- Total requests: ${totalRequests}`);
      console.log(`- Successful requests: ${completedRequests}`);
      console.log(`- Failed requests: ${failedRequests}`);
      console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`- Requests per second: ${requestsPerSecond.toFixed(2)}`);

      // Performance assertions
      expect(completedRequests).toBeGreaterThan(totalRequests * 0.8); // At least 80% success
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(requestsPerSecond).toBeGreaterThan(1); // At least 1 request per second
    });
  });
});