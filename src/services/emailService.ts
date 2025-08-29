import { config } from '../config/env';
import { logger } from '../middleware/logging';
import { JwtService } from './jwtService';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = config.EMAIL_FROM || 'noreply@finance-tracker.com';
  private static readonly BASE_URL = config.NODE_ENV === 'production' 
    ? 'https://finance-tracker.com' 
    : `http://localhost:${config.PORT}`;

  /**
   * Send email (mock implementation for development)
   */
  private static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // In development, we'll log the email instead of actually sending
      if (config.NODE_ENV === 'development') {
        logger.info('Email would be sent (development mode)', {
          to: options.to,
          subject: options.subject,
          html: options.html.length > 100 ? `${options.html.substring(0, 100)}...` : options.html
        });
        return;
      }

      // In production, you would integrate with a real email service like:
      // - AWS SES
      // - SendGrid
      // - Mailgun
      // - Nodemailer with SMTP
      
      // Mock successful send for now
      logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to, subject: options.subject });
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.BASE_URL}/auth/verify-email?token=${verificationToken}`;
    
    const template = this.getWelcomeEmailTemplate(firstName, verificationUrl);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent
    });

    logger.info('Welcome email sent', { email, firstName });
  }

  /**
   * Send email verification email
   */
  static async sendEmailVerification(email: string, firstName: string, userId: string): Promise<void> {
    try {
      const verificationToken = JwtService.generateEmailVerificationToken(userId, email);
      const verificationUrl = `${this.BASE_URL}/auth/verify-email?token=${verificationToken}`;
      
      const template = this.getEmailVerificationTemplate(firstName, verificationUrl);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      logger.info('Email verification sent', { email, userId });
    } catch (error) {
      logger.error('Failed to send email verification', { error, email, userId });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, firstName: string, userId: string): Promise<void> {
    try {
      const resetToken = JwtService.generatePasswordResetToken(userId, email);
      const resetUrl = `${this.BASE_URL}/auth/reset-password?token=${resetToken}`;
      
      const template = this.getPasswordResetTemplate(firstName, resetUrl);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      logger.info('Password reset email sent', { email, userId });
    } catch (error) {
      logger.error('Failed to send password reset email', { error, email, userId });
      throw error;
    }
  }

  /**
   * Send password change confirmation email
   */
  static async sendPasswordChangeConfirmation(email: string, firstName: string): Promise<void> {
    try {
      const template = this.getPasswordChangeConfirmationTemplate(firstName);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      logger.info('Password change confirmation sent', { email });
    } catch (error) {
      logger.error('Failed to send password change confirmation', { error, email });
      throw error;
    }
  }

  /**
   * Send account suspension notification
   */
  static async sendAccountSuspensionNotification(email: string, firstName: string, reason?: string): Promise<void> {
    try {
      const template = this.getAccountSuspensionTemplate(firstName, reason);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      logger.info('Account suspension notification sent', { email });
    } catch (error) {
      logger.error('Failed to send account suspension notification', { error, email });
      throw error;
    }
  }

  /**
   * Send security alert email
   */
  static async sendSecurityAlert(email: string, firstName: string, alertType: string, details: any): Promise<void> {
    try {
      const template = this.getSecurityAlertTemplate(firstName, alertType, details);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      logger.info('Security alert email sent', { email, alertType });
    } catch (error) {
      logger.error('Failed to send security alert email', { error, email, alertType });
      throw error;
    }
  }

  /**
   * Get welcome email template
   */
  private static getWelcomeEmailTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    const subject = 'Welcome to Finance Tracker - Please Verify Your Email';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Finance Tracker!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Thank you for signing up for Finance Tracker! We're excited to help you manage your personal finances.</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <p>Best regards,<br>The Finance Tracker Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Welcome to Finance Tracker!
      
      Hello ${firstName},
      
      Thank you for signing up for Finance Tracker! We're excited to help you manage your personal finances.
      
      To get started, please verify your email address by visiting this link:
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create this account, please ignore this email.
      
      Best regards,
      The Finance Tracker Team
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get email verification template
   */
  private static getEmailVerificationTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    const subject = 'Verify Your Email Address - Finance Tracker';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification Required</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Please verify your email address to complete your Finance Tracker account setup.</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Email Verification Required
      
      Hello ${firstName},
      
      Please verify your email address to complete your Finance Tracker account setup.
      
      Verification Link: ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't request this verification, please ignore this email.
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get password reset email template
   */
  private static getPasswordResetTemplate(firstName: string, resetUrl: string): EmailTemplate {
    const subject = 'Reset Your Password - Finance Tracker';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #FEF3C7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>You requested to reset your password for your Finance Tracker account.</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <div class="warning">
              <strong>Security Note:</strong> This reset link will expire in 1 hour for security reasons. 
              If you didn't request this password reset, please ignore this email and consider changing your password as a precaution.
            </div>
            <p>For security reasons, please ensure you're accessing Finance Tracker from our official website only.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Password Reset Request
      
      Hello ${firstName},
      
      You requested to reset your password for your Finance Tracker account.
      
      Reset Link: ${resetUrl}
      
      This reset link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email and consider changing your password as a precaution.
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get password change confirmation template
   */
  private static getPasswordChangeConfirmationTemplate(firstName: string): EmailTemplate {
    const subject = 'Password Changed Successfully - Finance Tracker';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #FEF3C7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Your password for Finance Tracker has been successfully changed.</p>
            <div class="warning">
              <strong>Security Note:</strong> If you didn't make this change, please contact our support team immediately 
              and consider that your account may have been compromised.
            </div>
            <p>For your security, all active sessions have been logged out and you'll need to sign in again with your new password.</p>
            <p>Thank you for keeping your account secure!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Password Changed Successfully
      
      Hello ${firstName},
      
      Your password for Finance Tracker has been successfully changed.
      
      If you didn't make this change, please contact our support team immediately.
      
      For your security, all active sessions have been logged out and you'll need to sign in again with your new password.
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get account suspension template
   */
  private static getAccountSuspensionTemplate(firstName: string, reason?: string): EmailTemplate {
    const subject = 'Account Suspended - Finance Tracker';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Suspended</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Your Finance Tracker account has been suspended.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is an error or would like to appeal this decision, please contact our support team.</p>
            <p>We apologize for any inconvenience this may cause.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Account Suspended
      
      Hello ${firstName},
      
      Your Finance Tracker account has been suspended.
      
      ${reason ? `Reason: ${reason}` : ''}
      
      If you believe this is an error or would like to appeal this decision, please contact our support team.
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get security alert template
   */
  private static getSecurityAlertTemplate(firstName: string, alertType: string, details: any): EmailTemplate {
    const subject = `Security Alert - ${alertType} - Finance Tracker`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .alert { background-color: #FEF3C7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Alert</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <div class="alert">
              <strong>Alert Type:</strong> ${alertType}<br>
              <strong>Time:</strong> ${new Date().toLocaleString()}<br>
              ${details.ip ? `<strong>IP Address:</strong> ${details.ip}<br>` : ''}
              ${details.userAgent ? `<strong>User Agent:</strong> ${details.userAgent}<br>` : ''}
            </div>
            <p>We detected unusual activity on your Finance Tracker account. If this was you, you can ignore this message.</p>
            <p>If you didn't perform this action, please:</p>
            <ul>
              <li>Change your password immediately</li>
              <li>Review your account activity</li>
              <li>Contact our support team</li>
            </ul>
          </div>
          <div class="footer">
            <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Security Alert: ${alertType}
      
      Hello ${firstName},
      
      We detected unusual activity on your Finance Tracker account at ${new Date().toLocaleString()}.
      
      If this wasn't you, please:
      - Change your password immediately
      - Review your account activity
      - Contact our support team
    `;

    return { subject, htmlContent, textContent };
  }
}