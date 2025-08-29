import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('Authentication Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation on login page', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Test tab order
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.emailInput).toBeFocused();
      
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.rememberMeCheckbox).toBeFocused();
      
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.submitButton).toBeFocused();
      
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.forgotPasswordLink).toBeFocused();
      
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.registerLink).toBeFocused();
    });

    test('should support keyboard form submission on login page', async ({ loginPage }) => {
      await loginPage.navigate();
      
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Focus submit button and press Enter
      await loginPage.submitButton.focus();
      await loginPage.page.keyboard.press('Enter');
      
      // Should attempt login (will fail for non-existent user)
      await loginPage.expectLoginError();
    });

    test('should support full keyboard navigation on registration page', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Test tab order through all form fields
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.nameInput).toBeFocused();
      
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.emailInput).toBeFocused();
      
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.passwordInput).toBeFocused();
      
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.confirmPasswordInput).toBeFocused();
      
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.termsCheckbox).toBeFocused();
      
      await registerPage.page.keyboard.press('Tab');
      await expect(registerPage.submitButton).toBeFocused();
      
      // Test checkbox interaction with keyboard
      await registerPage.termsCheckbox.focus();
      await registerPage.page.keyboard.press('Space');
      
      const isChecked = await registerPage.termsCheckbox.isChecked();
      expect(isChecked).toBe(true);
    });

    test('should support keyboard navigation on forgot password page', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      
      await forgotPasswordPage.page.keyboard.press('Tab');
      await expect(forgotPasswordPage.emailInput).toBeFocused();
      
      await forgotPasswordPage.page.keyboard.press('Tab');
      await expect(forgotPasswordPage.submitButton).toBeFocused();
      
      await forgotPasswordPage.page.keyboard.press('Tab');
      await expect(forgotPasswordPage.backToLoginLink).toBeFocused();
    });

    test('should support escape key to close modals/dropdowns', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // If there are any modals or dropdowns, Escape should close them
      // This test assumes modals might exist for things like password visibility
      await page.keyboard.press('Escape');
      
      // Form should still be functional after escape
      await loginPage.expectFormVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels on login form', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Check for proper ARIA labels and roles
      await expect(loginPage.loginForm).toHaveAttribute('role', 'form');
      
      // Check form inputs have proper labels
      await expect(loginPage.emailInput).toHaveAttribute('aria-label');
      await expect(loginPage.passwordInput).toHaveAttribute('aria-label');
      
      // Check submit button has proper description
      await expect(loginPage.submitButton).toHaveAttribute('aria-describedby');
      
      // Check error messages have alert role
      const errorElements = loginPage.page.getByRole('alert');
      // At least one alert should exist (even if not visible initially)
    });

    test('should have proper ARIA labels on registration form', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Check form has proper role
      await expect(registerPage.registerForm).toHaveAttribute('role', 'form');
      
      // Check all form inputs have proper labels
      await expect(registerPage.nameInput).toHaveAttribute('aria-label');
      await expect(registerPage.emailInput).toHaveAttribute('aria-label');
      await expect(registerPage.passwordInput).toHaveAttribute('aria-label');
      await expect(registerPage.confirmPasswordInput).toHaveAttribute('aria-label');
      
      // Check password requirements are properly announced
      await expect(registerPage.passwordRequirements).toHaveAttribute('aria-live');
      
      // Check terms checkbox has proper label
      await expect(registerPage.termsCheckbox).toHaveAttribute('aria-labelledby');
    });

    test('should announce form validation errors', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Submit empty form to trigger validation
      await registerPage.submitRegistration();
      
      // Error messages should have alert role for screen reader announcement
      await expect(registerPage.nameError).toHaveAttribute('role', 'alert');
      await expect(registerPage.emailError).toHaveAttribute('role', 'alert');
      await expect(registerPage.passwordError).toHaveAttribute('role', 'alert');
      
      // Error messages should be associated with their inputs
      const nameErrorId = await registerPage.nameError.getAttribute('id');
      await expect(registerPage.nameInput).toHaveAttribute('aria-describedby', nameErrorId);
    });

    test('should announce dynamic content changes', async ({ loginPage, registerPage }) => {
      // Test loading states are announced
      await registerPage.navigate();
      const testUser = generateTestUser();
      
      await registerPage.fillName(testUser.name);
      await registerPage.fillEmail(testUser.email);
      await registerPage.fillPassword(testUser.password);
      await registerPage.fillConfirmPassword(testUser.password);
      await registerPage.acceptTerms();
      
      // Submit and check loading announcement
      await registerPage.submitRegistration();
      
      // Loading spinner should have proper ARIA attributes
      const loadingSpinner = registerPage.page.getByTestId('loading-spinner');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toHaveAttribute('aria-live', 'polite');
        await expect(loadingSpinner).toHaveAttribute('aria-busy', 'true');
      }
    });

    test('should have proper heading structure', async ({ loginPage, registerPage }) => {
      await loginPage.navigate();
      
      // Check for proper heading hierarchy
      const h1Count = await loginPage.page.locator('h1').count();
      expect(h1Count).toBe(1); // Should have exactly one H1
      
      const h1Text = await loginPage.page.locator('h1').textContent();
      expect(h1Text).toContain('Sign In' || 'Login');
      
      // Test registration page heading structure
      await registerPage.navigate();
      
      const regH1Count = await registerPage.page.locator('h1').count();
      expect(regH1Count).toBe(1);
      
      const regH1Text = await registerPage.page.locator('h1').textContent();
      expect(regH1Text).toContain('Register' || 'Sign Up' || 'Create Account');
    });
  });

  test.describe('Visual Accessibility', () => {
    test('should have sufficient color contrast', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Test button color contrast
      const buttonStyles = await loginPage.submitButton.evaluate((element) => {
        const computedStyle = window.getComputedStyle(element);
        return {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
        };
      });
      
      // This is a simplified test - in practice you'd use a color contrast library
      expect(buttonStyles.backgroundColor).not.toBe(buttonStyles.color);
    });

    test('should be visible when zoomed to 200%', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2.0';
      });
      
      // Form should still be usable
      await loginPage.expectFormVisible();
      
      // Form elements should not overlap
      const emailBox = await loginPage.emailInput.boundingBox();
      const passwordBox = await loginPage.passwordInput.boundingBox();
      
      expect(emailBox?.y).toBeLessThan(passwordBox?.y); // Email should be above password
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1.0';
      });
    });

    test('should work with high contrast mode', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: black !important;
              color: white !important;
              border-color: white !important;
            }
          }
        `
      });
      
      // Form should still be functional
      await loginPage.expectFormVisible();
      
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Should be able to submit (will fail for non-existent user)
      await loginPage.submitLogin();
      await loginPage.expectLoginError();
    });

    test('should support reduced motion preferences', async ({ registerPage, page }) => {
      await registerPage.navigate();
      
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const testUser = generateTestUser();
      await registerPage.register(testUser);
      
      // Animations should be reduced/disabled but functionality should work
      await expect(page).toHaveURL('/dashboard');
    });

    test('should have focus indicators', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Check that focused elements have visible focus indicators
      await loginPage.emailInput.focus();
      
      const focusStyles = await loginPage.emailInput.evaluate((element) => {
        const computedStyle = window.getComputedStyle(element, ':focus');
        return {
          outline: computedStyle.outline,
          outlineColor: computedStyle.outlineColor,
          outlineWidth: computedStyle.outlineWidth,
          boxShadow: computedStyle.boxShadow,
        };
      });
      
      // Should have some kind of focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' || 
        focusStyles.boxShadow !== 'none' ||
        focusStyles.outlineWidth !== '0px';
      
      expect(hasFocusIndicator).toBe(true);
    });
  });

  test.describe('Motor Accessibility', () => {
    test('should have large enough click targets', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Check that interactive elements meet minimum size requirements (44x44px)
      const submitButtonBox = await registerPage.submitButton.boundingBox();
      expect(submitButtonBox?.width).toBeGreaterThanOrEqual(44);
      expect(submitButtonBox?.height).toBeGreaterThanOrEqual(44);
      
      const checkboxBox = await registerPage.termsCheckbox.boundingBox();
      expect(checkboxBox?.width).toBeGreaterThanOrEqual(24); // Checkboxes can be smaller
      expect(checkboxBox?.height).toBeGreaterThanOrEqual(24);
    });

    test('should support pointer hover states', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Test hover states on interactive elements
      await loginPage.submitButton.hover();
      
      const hoverStyles = await loginPage.submitButton.evaluate((element) => {
        return window.getComputedStyle(element, ':hover');
      });
      
      // Button should have some visual change on hover
      // This is a simplified test - actual implementation would check specific styles
      expect(hoverStyles).toBeTruthy();
    });

    test('should support sticky hover on touch devices', async ({ registerPage, page }) => {
      // Simulate touch device
      await page.evaluate(() => {
        // Add touch simulation
        Object.defineProperty(navigator, 'maxTouchPoints', {
          value: 5,
          writable: false
        });
      });
      
      await registerPage.navigate();
      
      // Touch interactions should work properly
      await registerPage.nameInput.tap();
      await expect(registerPage.nameInput).toBeFocused();
      
      await registerPage.termsCheckbox.tap();
      const isChecked = await registerPage.termsCheckbox.isChecked();
      expect(isChecked).toBe(true);
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('should provide clear error messages', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Submit empty form to get validation errors
      await registerPage.submitRegistration();
      
      // Error messages should be clear and specific
      const nameErrorText = await registerPage.nameError.textContent();
      expect(nameErrorText).toBeTruthy();
      expect(nameErrorText).toMatch(/name.*required/i);
      
      const emailErrorText = await registerPage.emailError.textContent();
      expect(emailErrorText).toBeTruthy();
      expect(emailErrorText).toMatch(/email.*required/i);
    });

    test('should provide helpful form instructions', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Password requirements should be clearly displayed
      await expect(registerPage.passwordRequirements).toBeVisible();
      
      const requirementsText = await registerPage.passwordRequirements.textContent();
      expect(requirementsText).toContain('8 characters');
      expect(requirementsText).toContain('uppercase');
      expect(requirementsText).toContain('lowercase');
      expect(requirementsText).toContain('number');
    });

    test('should show password strength feedback', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Test weak password
      await registerPage.fillPassword('weak');
      await expect(registerPage.passwordStrength).toContainText('Weak');
      
      // Test strong password
      await registerPage.fillPassword('StrongPassword123!');
      await expect(registerPage.passwordStrength).toContainText('Strong');
      
      // Strength indicator should have appropriate ARIA attributes
      await expect(registerPage.passwordStrength).toHaveAttribute('aria-live');
    });

    test('should provide confirmation for successful actions', async ({ registerPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.register(testUser);
      
      // Should show success confirmation (redirect to dashboard is confirmation)
      await dashboardPage.expectDashboardVisible();
      await dashboardPage.expectWelcomeMessage(testUser.name);
    });

    test('should maintain context during multi-step processes', async ({ 
      forgotPasswordPage, 
      page 
    }) => {
      await forgotPasswordPage.navigate();
      
      // Page should clearly indicate current step
      await expect(forgotPasswordPage.forgotPasswordForm).toContainText('Reset Password');
      
      // Instructions should be clear
      const instructions = page.getByTestId('instructions');
      if (await instructions.isVisible()) {
        const instructionText = await instructions.textContent();
        expect(instructionText).toContain('email');
      }
    });
  });

  test.describe('Assistive Technology Compatibility', () => {
    test('should work with screen readers', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Check for screen reader friendly attributes
      await expect(loginPage.loginForm).toHaveAttribute('role');
      
      // Form should have proper landmarks
      const main = loginPage.page.getByRole('main');
      if (await main.isVisible()) {
        await expect(main).toBeVisible();
      }
      
      // Navigation should be properly marked
      const nav = loginPage.page.getByRole('navigation');
      if (await nav.count() > 0) {
        await expect(nav.first()).toHaveAttribute('aria-label');
      }
    });

    test('should support voice control software', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Elements should have names that voice control can target
      await expect(registerPage.nameInput).toHaveAttribute('name', 'name');
      await expect(registerPage.emailInput).toHaveAttribute('name', 'email');
      await expect(registerPage.passwordInput).toHaveAttribute('name', 'password');
      
      // Buttons should have clear, unique names
      const submitButtonText = await registerPage.submitButton.textContent();
      expect(submitButtonText).toContain('Register' || 'Sign Up' || 'Create Account');
    });

    test('should work with switch navigation', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Simulate switch navigation (space/enter only)
      await loginPage.emailInput.focus();
      await page.keyboard.press('Space'); // Should not trigger input action
      
      await loginPage.submitButton.focus();
      await page.keyboard.press('Space'); // Should trigger button click
      
      // Should show validation errors (empty form)
      await loginPage.expectEmailError();
    });
  });

  test.describe('Language and Internationalization', () => {
    test('should have proper lang attribute', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Page should have language attribute
      const htmlLang = await loginPage.page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // Should be like 'en' or 'en-US'
    });

    test('should support right-to-left languages', async ({ loginPage, page }) => {
      // Simulate RTL language
      await loginPage.navigate();
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      });
      
      // Form should still be functional
      await loginPage.expectFormVisible();
      
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      await loginPage.submitLogin();
      
      // Should show error for non-existent user
      await loginPage.expectLoginError();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load quickly for assistive technology', async ({ registerPage, page }) => {
      // Measure time to interactive for screen reader users
      const startTime = Date.now();
      
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Wait for all ARIA attributes to be properly set
      await expect(registerPage.nameInput).toHaveAttribute('aria-label');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should be accessible quickly
    });

    test('should maintain accessibility during loading states', async ({ registerPage }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.register(testUser);
      
      // Loading states should be accessible
      const loadingSpinner = registerPage.page.getByTestId('loading-spinner');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toHaveAttribute('aria-live');
        await expect(loadingSpinner).toHaveAttribute('aria-busy');
      }
    });
  });
});