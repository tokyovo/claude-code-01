import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuthActions, useRequireGuest } from '../../hooks/auth';
import { ROUTES } from '../../constants';
import { registerSchema, type RegisterFormData, getPasswordStrength } from '../../utils/validation';

// Extended form data for UI purposes
interface ExtendedRegisterFormData extends RegisterFormData {
  agreeToTerms: boolean;
}

const RegisterForm: React.FC = () => {
  // Redirect authenticated users
  const { isAllowed } = useRequireGuest();
  
  // Authentication actions
  const { register: registerUser, isRegisterLoading } = useAuthActions();

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Enhanced register schema with terms agreement
  const extendedRegisterSchema = registerSchema.extend({
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: 'You must agree to the terms and conditions'
    })
  });

  // Form management with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields, isSubmitting },
    watch,
    setError,
    clearErrors,
  } = useForm<ExtendedRegisterFormData>({
    resolver: zodResolver(extendedRegisterSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    }
  });

  // Watch password for strength indicator
  const watchedPassword = watch('password');
  const watchedFields = watch();

  // Memoized password strength calculation
  const passwordStrength = useMemo(() => {
    return getPasswordStrength(watchedPassword || '');
  }, [watchedPassword]);

  // Handle form submission with enhanced error handling
  const onSubmit = async (data: ExtendedRegisterFormData) => {
    try {
      const result = await registerUser({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      if (!result.success && result.error) {
        // Handle different types of API errors
        const error = result.error;
        
        if (error.status === 409) {
          // Email already exists
          setError('email', {
            type: 'server',
            message: 'An account with this email already exists'
          });
        } else if (error.status === 400) {
          // Validation errors
          if (error.data?.field) {
            setError(error.data.field as keyof ExtendedRegisterFormData, {
              type: 'server',
              message: error.data.message
            });
          } else {
            setError('email', {
              type: 'server',
              message: error.data?.message || 'Registration failed'
            });
          }
        } else if (error.status === 429) {
          // Rate limited
          setError('email', {
            type: 'server',
            message: 'Too many registration attempts. Please try again later.'
          });
        } else {
          // Generic error
          setError('email', {
            type: 'server',
            message: error.data?.message || 'Registration failed. Please try again.'
          });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('email', {
        type: 'server',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  // Password strength indicator component
  const PasswordStrengthIndicator: React.FC<{ strength: number; feedback: string[] }> = ({ 
    strength, 
    feedback 
  }) => {
    const strengthColors = ['bg-red-400', 'bg-red-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-green-400'];
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    return (
      <div className="mt-2">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 flex-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
                  level <= strength ? strengthColors[strength - 1] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-gray-600 min-w-fit">
            {strength > 0 ? strengthLabels[strength - 1] : 'Enter password'}
          </span>
        </div>
        {feedback.length > 0 && (
          <div className="mt-1">
            <p className="text-xs text-gray-600">
              Password needs: {feedback.join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Don't render if user is authenticated
  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8" role="main" aria-labelledby="register-title">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 id="register-title" className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Personal Finance Tracker today
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Registration form">
          {/* First Name Field */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <div className="mt-1">
              <input
                {...register('first_name')}
                id="first_name"
                type="text"
                autoComplete="given-name"
                autoFocus
                aria-invalid={errors.first_name ? 'true' : 'false'}
                aria-describedby={errors.first_name ? 'first-name-error' : undefined}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                  errors.first_name
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.first_name && !errors.first_name
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your first name"
                disabled={isRegisterLoading || isSubmitting}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600" id="first-name-error" role="alert">
                  {errors.first_name.message}
                </p>
              )}
            </div>
          </div>

          {/* Last Name Field */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <div className="mt-1">
              <input
                {...register('last_name')}
                id="last_name"
                type="text"
                autoComplete="family-name"
                aria-invalid={errors.last_name ? 'true' : 'false'}
                aria-describedby={errors.last_name ? 'last-name-error' : undefined}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                  errors.last_name
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.last_name && !errors.last_name
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your last name"
                disabled={isRegisterLoading || isSubmitting}
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600" id="last-name-error" role="alert">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1">
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : 'email-help'}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                  errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.email && !errors.email
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your email address"
                disabled={isRegisterLoading || isSubmitting}
              />
              {errors.email ? (
                <p className="mt-1 text-sm text-red-600" id="email-error" role="alert">
                  {errors.email.message}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500" id="email-help">
                  We'll use this email to send you account updates
                </p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : 'password-help'}
                className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                  errors.password
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.password && passwordStrength.score >= 3
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Create a strong password"
                disabled={isRegisterLoading || isSubmitting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isRegisterLoading || isSubmitting}
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-sm text-red-600" id="password-error" role="alert">
                {errors.password.message}
              </p>
            ) : (
              <div id="password-help">
                <PasswordStrengthIndicator 
                  strength={passwordStrength.score} 
                  feedback={passwordStrength.feedback}
                />
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                  errors.confirmPassword
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.confirmPassword && !errors.confirmPassword
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Confirm your password"
                disabled={isRegisterLoading || isSubmitting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                disabled={isRegisterLoading || isSubmitting}
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {showConfirmPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600" id="confirm-password-error" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              {...register('agreeToTerms')}
              id="agreeToTerms"
              type="checkbox"
              aria-invalid={errors.agreeToTerms ? 'true' : 'false'}
              aria-describedby={errors.agreeToTerms ? 'terms-error' : undefined}
              className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200 ${
                errors.agreeToTerms ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              disabled={isRegisterLoading || isSubmitting}
            />
            <label htmlFor="agreeToTerms" className="ml-3 block text-sm text-gray-900 leading-5">
              I agree to the{' '}
              <Link
                to={ROUTES.TERMS_OF_SERVICE}
                className="text-blue-600 hover:text-blue-500 font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to={ROUTES.PRIVACY_POLICY}
                className="text-blue-600 hover:text-blue-500 font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600" id="terms-error" role="alert">
              {errors.agreeToTerms.message}
            </p>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={!isValid || isRegisterLoading || isSubmitting || passwordStrength.score < 3}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 ${
                !isValid || isRegisterLoading || isSubmitting || passwordStrength.score < 3
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transform hover:scale-105'
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {(isRegisterLoading || isSubmitting) && (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </span>
              {(isRegisterLoading || isSubmitting) ? 'Creating account...' : 'Create account'}
            </button>
            {passwordStrength.score < 3 && watchedPassword && (
              <p className="mt-2 text-xs text-center text-gray-500">
                Password must be at least "Good" strength to continue
              </p>
            )}
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>

        {/* Development Mode Indicators */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800">Development Info</h4>
            <div className="mt-2 text-xs text-yellow-700 space-y-1">
              <p>Form Valid: {isValid ? '✅' : '❌'}</p>
              <p>First Name: {watchedFields.first_name || 'Empty'}</p>
              <p>Last Name: {watchedFields.last_name || 'Empty'}</p>
              <p>Email: {watchedFields.email || 'Empty'}</p>
              <p>Password Strength: {passwordStrength.score}/5</p>
              <p>Passwords Match: {watchedFields.confirmPassword === watchedFields.password ? '✅' : '❌'}</p>
              <p>Agree to Terms: {watchedFields.agreeToTerms ? '✅' : '❌'}</p>
              <p>Loading: {isRegisterLoading || isSubmitting ? '⏳' : '✅'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterForm;