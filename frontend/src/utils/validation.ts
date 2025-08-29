// Validation schemas using Zod for React Hook Form
import { z } from 'zod';
import { VALIDATION } from '../constants';

// Common validation patterns
const email = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .trim();

const password = z
  .string()
  .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)');

const confirmPassword = (passwordField: string = 'password') => z
  .string()
  .min(1, 'Please confirm your password');

const name = z
  .string()
  .min(VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
  .max(VALIDATION.NAME_MAX_LENGTH, `Name must be no more than ${VALIDATION.NAME_MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

// Authentication schemas
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  first_name: name,
  last_name: name,
  email,
  password,
  confirmPassword: confirmPassword(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password,
  confirmPassword: confirmPassword(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
  confirmPassword: confirmPassword('newPassword'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile schemas
export const updateProfileSchema = z.object({
  first_name: name.optional(),
  last_name: name.optional(),
  email: email.optional(),
});

// Transaction schemas
export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Please select a transaction type' }),
  }),
  amount: z
    .number({
      errorMap: () => ({ message: 'Please enter a valid amount' }),
    })
    .positive('Amount must be greater than 0')
    .max(999999999.99, 'Amount is too large'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(VALIDATION.DESCRIPTION_MAX_LENGTH, `Description must be no more than ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters`)
    .trim(),
  categoryId: z.string().min(1, 'Please select a category'),
  date: z.string().min(1, 'Date is required'),
  accountId: z.string().optional(),
});

// Category schemas
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be no more than 50 characters')
    .trim(),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Please select a category type' }),
  }),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Please select a valid color').optional(),
});

// Budget schemas
export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category'),
  amount: z
    .number({
      errorMap: () => ({ message: 'Please enter a valid amount' }),
    })
    .positive('Budget amount must be greater than 0')
    .max(999999999.99, 'Budget amount is too large'),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY'], {
    errorMap: () => ({ message: 'Please select a budget period' }),
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Account schemas
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(50, 'Account name must be no more than 50 characters')
    .trim(),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH'], {
    errorMap: () => ({ message: 'Please select an account type' }),
  }),
  balance: z
    .number({
      errorMap: () => ({ message: 'Please enter a valid balance' }),
    })
    .max(999999999.99, 'Balance is too large'),
  currency: z.string().min(1, 'Currency is required'),
});

// Type exports for components
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  try {
    z.string().email().parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validatePassword = (password: string): boolean => {
  try {
    z.string()
      .min(VALIDATION.PASSWORD_MIN_LENGTH)
      .regex(/^(?=.*[a-z])/)
      .regex(/^(?=.*[A-Z])/)
      .regex(/^(?=.*\d)/)
      .regex(/^(?=.*[@$!%*?&])/)
      .parse(password);
    return true;
  } catch {
    return false;
  }
};

export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= VALIDATION.PASSWORD_MIN_LENGTH) {
    score += 1;
  } else {
    feedback.push(`At least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('One lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('One uppercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('One number');
  }

  if (/[@$!%*?&]/.test(password)) {
    score += 1;
  } else {
    feedback.push('One special character (@$!%*?&)');
  }

  return { score, feedback };
};