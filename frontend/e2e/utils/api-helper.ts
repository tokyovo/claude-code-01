import { APIRequestContext, request } from '@playwright/test';

export class ApiHelper {
  private baseURL: string;
  private context: APIRequestContext | null = null;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  async init(): Promise<void> {
    if (!this.context) {
      this.context = await request.newContext({
        baseURL: this.baseURL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }

  // Authentication API calls
  async registerUser(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/register', {
      data: userData,
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async loginUser(credentials: {
    email: string;
    password: string;
  }): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/login', {
      data: credentials,
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async forgotPassword(email: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/forgot-password', {
      data: { email },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async resetPassword(resetData: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/reset-password', {
      data: resetData,
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async refreshToken(refreshToken: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/refresh', {
      data: { refreshToken },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async logoutUser(token: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.post('/api/auth/logout', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  // User management API calls
  async getUserProfile(token: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.get('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async updateUserProfile(token: string, profileData: {
    name?: string;
    email?: string;
  }): Promise<any> {
    await this.init();
    
    const response = await this.context!.put('/api/user/profile', {
      data: profileData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async deleteUser(token: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.delete('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  // Security API calls
  async getSecurityMetrics(token: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.get('/api/security/metrics', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async getLoginAttempts(token: string): Promise<any> {
    await this.init();
    
    const response = await this.context!.get('/api/security/login-attempts', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  // Rate limiting testing
  async testRateLimit(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', requestCount: number = 10): Promise<any[]> {
    await this.init();
    
    const results = [];
    
    for (let i = 0; i < requestCount; i++) {
      const startTime = Date.now();
      
      let response;
      switch (method) {
        case 'GET':
          response = await this.context!.get(endpoint);
          break;
        case 'POST':
          response = await this.context!.post(endpoint, { data: {} });
          break;
        case 'PUT':
          response = await this.context!.put(endpoint, { data: {} });
          break;
        case 'DELETE':
          response = await this.context!.delete(endpoint);
          break;
      }
      
      const endTime = Date.now();
      
      results.push({
        attempt: i + 1,
        status: response.status(),
        responseTime: endTime - startTime,
        rateLimited: response.status() === 429,
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }

  // Health check
  async healthCheck(): Promise<any> {
    await this.init();
    
    try {
      const response = await this.context!.get('/api/health');
      
      return {
        status: response.status(),
        data: response.ok() ? await response.json() : await response.text(),
        healthy: response.ok(),
      };
    } catch (error) {
      return {
        status: 0,
        data: error.message,
        healthy: false,
      };
    }
  }

  // Database cleanup helpers
  async cleanupTestUsers(emailPattern: string = '@playwright.test'): Promise<any> {
    await this.init();
    
    // This would be a special endpoint for test cleanup
    const response = await this.context!.delete('/api/test/cleanup-users', {
      data: { emailPattern },
      headers: {
        'X-Test-Cleanup': 'true', // Special header for test operations
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  async cleanupTestData(): Promise<any> {
    await this.init();
    
    // This would clean up all test-related data
    const response = await this.context!.delete('/api/test/cleanup-all', {
      headers: {
        'X-Test-Cleanup': 'true',
      },
    });

    return {
      status: response.status(),
      data: response.ok() ? await response.json() : await response.text(),
    };
  }

  // Performance testing helpers
  async measureApiPerformance(endpoint: string, method: 'GET' | 'POST', sampleSize: number = 10): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
  }> {
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const startTime = Date.now();
      
      try {
        let response;
        if (method === 'GET') {
          response = await this.context!.get(endpoint);
        } else {
          response = await this.context!.post(endpoint, { data: {} });
        }
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push(responseTime);
        
        if (response.ok()) {
          successCount++;
        }
      } catch (error) {
        results.push(0); // Failed request
      }
    }
    
    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);
    const successRate = (successCount / sampleSize) * 100;
    
    return {
      averageTime,
      minTime,
      maxTime,
      successRate,
    };
  }
}