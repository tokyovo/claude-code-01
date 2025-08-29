import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

// Validation target types
type ValidationTarget = 'body' | 'params' | 'query' | 'headers';

// Validation configuration interface
interface ValidationConfig {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

// Custom Joi extensions for financial data
const customJoi = Joi.extend((joi) => ({
  type: 'currency',
  base: joi.number(),
  messages: {
    'currency.precision': '{{#label}} must have at most 2 decimal places',
    'currency.positive': '{{#label}} must be a positive amount',
  },
  rules: {
    precision: {
      method(decimals: number = 2) {
        return this.$_addRule({
          name: 'precision',
          args: { decimals },
          method: function (value: number, helpers: any) {
            const factor = Math.pow(10, decimals);
            if (Math.round(value * factor) !== value * factor) {
              return helpers.error('currency.precision');
            }
            return value;
          },
        });
      },
    },
    positive: {
      method() {
        return this.$_addRule({
          name: 'positive',
          method: function (value: number, helpers: any) {
            if (value <= 0) {
              return helpers.error('currency.positive');
            }
            return value;
          },
        });
      },
    },
  },
}));

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid().required(),
  optionalUuid: Joi.string().uuid().optional(),
  
  // Email validation
  email: Joi.string().email().required(),
  optionalEmail: Joi.string().email().optional(),
  
  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
    }),
  
  // Currency amount validation (2 decimal places max)
  currency: (customJoi as any).currency().precision(2).min(0).max(999999999.99),
  positiveCurrency: (customJoi as any).currency().precision(2).positive(),
  
  // Date validation
  date: Joi.date().iso().required(),
  optionalDate: Joi.date().iso().optional(),
  
  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  },
  
  // Search and filtering
  search: Joi.string().max(255).optional(),
  
  // Transaction category
  category: Joi.string().max(50).required(),
  optionalCategory: Joi.string().max(50).optional(),
  
  // Transaction type
  transactionType: Joi.string().valid('income', 'expense').required(),
  
  // Budget period
  budgetPeriod: Joi.string().valid('weekly', 'monthly', 'yearly').required(),
  
  // Common string fields
  name: Joi.string().min(1).max(100).required(),
  optionalName: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  
  // Boolean fields
  isActive: Joi.boolean().default(true),
  
  // Time range filters
  dateRange: {
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional(),
    }),
  },
};

// User validation schemas
export const userValidation = {
  register: {
    body: Joi.object({
      email: commonSchemas.email,
      password: commonSchemas.password,
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({ 'any.only': 'Passwords must match' }),
    }),
  },
  
  login: {
    body: Joi.object({
      email: commonSchemas.email,
      password: Joi.string().required(),
    }),
  },
  
  updateProfile: {
    body: Joi.object({
      firstName: Joi.string().min(1).max(50).optional(),
      lastName: Joi.string().min(1).max(50).optional(),
      email: commonSchemas.optionalEmail,
    }),
  },
  
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: commonSchemas.password,
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        .messages({ 'any.only': 'Passwords must match' }),
    }),
  },
  
  forgotPassword: {
    body: Joi.object({
      email: commonSchemas.email,
    }),
  },
  
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      password: commonSchemas.password,
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({ 'any.only': 'Passwords must match' }),
    }),
  },
};

// Transaction validation schemas
export const transactionValidation = {
  create: {
    body: Joi.object({
      amount: commonSchemas.positiveCurrency,
      description: Joi.string().min(1).max(255).required(),
      categoryId: commonSchemas.uuid,
      accountId: commonSchemas.uuid,
      type: commonSchemas.transactionType,
      date: commonSchemas.date,
      tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
      receiptUrl: Joi.string().uri().optional(),
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
    body: Joi.object({
      amount: commonSchemas.positiveCurrency.optional(),
      description: Joi.string().min(1).max(255).optional(),
      categoryId: commonSchemas.optionalUuid,
      type: Joi.string().valid('income', 'expense').optional(),
      date: commonSchemas.optionalDate,
      tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
      receiptUrl: Joi.string().uri().optional(),
    }),
  },
  
  getById: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
  },
  
  getAll: {
    query: Joi.object({
      ...commonSchemas.pagination,
      ...commonSchemas.dateRange,
      categoryId: commonSchemas.optionalUuid,
      type: Joi.string().valid('income', 'expense').optional(),
      minAmount: commonSchemas.currency.optional(),
      maxAmount: commonSchemas.currency.optional(),
      search: commonSchemas.search,
      accountId: commonSchemas.optionalUuid,
    }),
  },
  
  delete: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
  },
};

// Budget validation schemas
export const budgetValidation = {
  create: {
    body: Joi.object({
      name: commonSchemas.name,
      amount: commonSchemas.positiveCurrency,
      categoryId: commonSchemas.uuid,
      period: commonSchemas.budgetPeriod,
      startDate: commonSchemas.date,
      endDate: commonSchemas.date.when('startDate', {
        is: Joi.exist(),
        then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      }),
      alertThreshold: Joi.number().min(0).max(100).default(80),
      description: commonSchemas.description,
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
    body: Joi.object({
      name: commonSchemas.optionalName,
      amount: commonSchemas.positiveCurrency.optional(),
      categoryId: commonSchemas.optionalUuid,
      period: Joi.string().valid('weekly', 'monthly', 'yearly').optional(),
      startDate: commonSchemas.optionalDate,
      endDate: commonSchemas.optionalDate,
      alertThreshold: Joi.number().min(0).max(100).optional(),
      description: commonSchemas.description,
      isActive: commonSchemas.isActive.optional(),
    }),
  },
  
  getById: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
  },
  
  getAll: {
    query: Joi.object({
      ...commonSchemas.pagination,
      categoryId: commonSchemas.optionalUuid,
      period: Joi.string().valid('weekly', 'monthly', 'yearly').optional(),
      isActive: Joi.boolean().optional(),
      ...commonSchemas.dateRange,
    }),
  },
};

// Category validation schemas
export const categoryValidation = {
  create: {
    body: Joi.object({
      name: commonSchemas.name,
      description: commonSchemas.description,
      color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
        .messages({ 'string.pattern.base': 'Color must be a valid hex color code' }),
      icon: Joi.string().max(50).optional(),
      parentId: commonSchemas.optionalUuid,
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
    body: Joi.object({
      name: commonSchemas.optionalName,
      description: commonSchemas.description,
      color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
        .messages({ 'string.pattern.base': 'Color must be a valid hex color code' }),
      icon: Joi.string().max(50).optional(),
      parentId: commonSchemas.optionalUuid,
      isActive: commonSchemas.isActive.optional(),
    }),
  },
  
  getById: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
  },
  
  getAll: {
    query: Joi.object({
      ...commonSchemas.pagination,
      parentId: commonSchemas.optionalUuid,
      isActive: Joi.boolean().optional(),
      search: commonSchemas.search,
    }),
  },
};

// Account validation schemas
export const accountValidation = {
  create: {
    body: Joi.object({
      name: commonSchemas.name,
      type: Joi.string().valid('checking', 'savings', 'credit', 'investment', 'cash').required(),
      balance: commonSchemas.currency.default(0),
      currency: Joi.string().length(3).uppercase().default('USD'),
      description: commonSchemas.description,
      bankName: Joi.string().max(100).optional(),
      accountNumber: Joi.string().max(50).optional(),
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
    body: Joi.object({
      name: commonSchemas.optionalName,
      type: Joi.string().valid('checking', 'savings', 'credit', 'investment', 'cash').optional(),
      balance: commonSchemas.currency.optional(),
      currency: Joi.string().length(3).uppercase().optional(),
      description: commonSchemas.description,
      bankName: Joi.string().max(100).optional(),
      accountNumber: Joi.string().max(50).optional(),
      isActive: commonSchemas.isActive.optional(),
    }),
  },
  
  getById: {
    params: Joi.object({
      id: commonSchemas.uuid,
    }),
  },
  
  getAll: {
    query: Joi.object({
      ...commonSchemas.pagination,
      type: Joi.string().valid('checking', 'savings', 'credit', 'investment', 'cash').optional(),
      isActive: Joi.boolean().optional(),
      currency: Joi.string().length(3).uppercase().optional(),
    }),
  },
};

// Main validation middleware factory
export const validate = (config: ValidationConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: any[] = [];
    
    // Validate each target
    Object.entries(config).forEach(([target, schema]) => {
      if (schema) {
        const { error, value } = schema.validate(req[target as ValidationTarget], {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
        });
        
        if (error) {
          const fieldErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          }));
          errors.push(...fieldErrors);
        } else {
          // Replace request data with validated and sanitized data
          req[target as ValidationTarget] = value;
        }
      }
    });
    
    if (errors.length > 0) {
      const errorMessage = errors.map(err => `${err.field}: ${err.message}`).join('; ');
      return next(new AppError(`Validation failed: ${errorMessage}`, 400));
    }
    
    next();
  };
};

// Specific validation middleware functions
export const validateUserRegistration = validate(userValidation.register);
export const validateUserLogin = validate(userValidation.login);
export const validateUserUpdate = validate(userValidation.updateProfile);
export const validatePasswordChange = validate(userValidation.changePassword);
export const validateForgotPassword = validate(userValidation.forgotPassword);
export const validateResetPassword = validate(userValidation.resetPassword);

export const validateTransactionCreate = validate(transactionValidation.create);
export const validateTransactionUpdate = validate(transactionValidation.update);
export const validateTransactionGetById = validate(transactionValidation.getById);
export const validateTransactionGetAll = validate(transactionValidation.getAll);
export const validateTransactionDelete = validate(transactionValidation.delete);

export const validateBudgetCreate = validate(budgetValidation.create);
export const validateBudgetUpdate = validate(budgetValidation.update);
export const validateBudgetGetById = validate(budgetValidation.getById);
export const validateBudgetGetAll = validate(budgetValidation.getAll);

export const validateCategoryCreate = validate(categoryValidation.create);
export const validateCategoryUpdate = validate(categoryValidation.update);
export const validateCategoryGetById = validate(categoryValidation.getById);
export const validateCategoryGetAll = validate(categoryValidation.getAll);

export const validateAccountCreate = validate(accountValidation.create);
export const validateAccountUpdate = validate(accountValidation.update);
export const validateAccountGetById = validate(accountValidation.getById);
export const validateAccountGetAll = validate(accountValidation.getAll);

// Custom validation middleware for file uploads
export const validateFileUpload = (
  allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  maxSize: number = 5 * 1024 * 1024 // 5MB default
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;
    
    if (!file) {
      return next(new AppError('File is required', 400));
    }
    
    // Check file type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return next(new AppError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        400
      ));
    }
    
    // Check file size
    if (file.size > maxSize) {
      return next(new AppError(
        `File size too large. Maximum allowed size: ${Math.round(maxSize / (1024 * 1024))}MB`,
        400
      ));
    }
    
    next();
  };
};

// Conditional validation middleware
export const conditionalValidate = (
  condition: (req: Request) => boolean,
  config: ValidationConfig
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      return validate(config)(req, res, next);
    }
    next();
  };
};