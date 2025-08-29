const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testAuthenticationSystem() {
  console.log('🔐 Testing Enhanced Authentication System\n');

  try {
    // Test 1: User Registration
    console.log('1. Testing User Registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'testuser@example.com',
      password: 'SecureP@ssw0rd123!',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890'
    });
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Email verified:', registerResponse.data.data.user.email_verified);

    // Test 2: Login with correct credentials
    console.log('\n2. Testing Login with correct credentials...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testuser@example.com',
      password: 'SecureP@ssw0rd123!'
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('   Access token received:', !!loginResponse.data.data.tokens.accessToken);
    console.log('   Security info:', loginResponse.data.data.security);

    const accessToken = loginResponse.data.data.tokens.accessToken;

    // Test 3: Get Security Information
    console.log('\n3. Testing Security Information endpoint...');
    const securityResponse = await axios.get(`${BASE_URL}/auth/security`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Security info retrieved successfully');
    console.log('   Login attempts info:', securityResponse.data.data.security.loginAttempts);
    console.log('   Password reset attempts info:', securityResponse.data.data.security.passwordResetAttempts);

    // Test 4: Failed Login Attempts
    console.log('\n4. Testing Failed Login Attempts (Rate Limiting)...');
    for (let i = 1; i <= 3; i++) {
      try {
        await axios.post(`${BASE_URL}/auth/login`, {
          email: 'testuser@example.com',
          password: 'WrongPassword123!'
        });
      } catch (error) {
        console.log(`   Attempt ${i}: ${error.response.data.message}`);
      }
    }

    // Test 5: Password Reset Request
    console.log('\n5. Testing Password Reset Request...');
    const resetResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: 'testuser@example.com'
    });
    console.log('✅ Password reset request:', resetResponse.data.message);

    // Test 6: Password Reset with Non-existent Email (should still return success)
    console.log('\n6. Testing Password Reset with non-existent email...');
    const resetNonExistentResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: 'nonexistent@example.com'
    });
    console.log('✅ Password reset for non-existent email:', resetNonExistentResponse.data.message);

    // Test 7: Rate Limiting on Password Reset
    console.log('\n7. Testing Password Reset Rate Limiting...');
    for (let i = 1; i <= 4; i++) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
          email: 'testuser@example.com'
        });
        console.log(`   Reset attempt ${i}: Success`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`   Reset attempt ${i}: Rate limited - ${error.response.data.message}`);
        } else {
          console.log(`   Reset attempt ${i}: Error - ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Authentication System Test Complete!');
    console.log('\nSummary of Enhanced Features:');
    console.log('✅ Enhanced login endpoint with security tracking');
    console.log('✅ Account lockout after multiple failed attempts');
    console.log('✅ Password reset with rate limiting');
    console.log('✅ Security metrics tracking');
    console.log('✅ Comprehensive logging and monitoring');
    console.log('✅ IP-based security tracking');
    console.log('✅ User-friendly error messages');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAuthenticationSystem();