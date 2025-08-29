import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPasswordMutation } from '../../store/api/apiSlice';
import { ROUTES } from '../../constants';
import { resetPasswordSchema, type ResetPasswordFormData, getPasswordStrength } from '../../utils/validation';

interface ResetPasswordFormProps {
  onSuccess?: () => void;
  className?: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ 
  onSuccess, 
  className = '' 
}) => {
  const [searchParams] = useSearchParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get('token') || '';

  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  // Form management with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
    setError,
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      token,
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password');
  const passwordStrength = getPasswordStrength(watchedPassword || '');

  // Set token when it changes
  useEffect(() => {
    setValue('token', token);
  }, [token, setValue]);

  // Handle form submission
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword(data).unwrap();
      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      // Handle different error types
      if (err.status === 400) {
        if (err.data?.message?.includes('token')) {
          setError('token', {
            type: 'server',
            message: 'Invalid or expired reset token'
          });
        } else {
          setError('password', {
            type: 'server',
            message: err.data?.message || 'Invalid password'
          });
        }
      } else if (err.status === 404) {
        setError('token', {
          type: 'server',
          message: 'Reset token not found or has expired'
        });
      } else if (err.status === 429) {
        setError('token', {
          type: 'server',
          message: 'Too many reset attempts. Please request a new link.'
        });
      } else if (err.data?.message) {
        setError('password', {
          type: 'server',
          message: err.data.message
        });
      } else {
        setError('password', {
          type: 'server',
          message: 'Failed to reset password. Please try again.'
        });
      }
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
                className={`h-2 flex-1 rounded-full ${
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

  if (isSubmitted) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Success State */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Password reset successful
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
        </div>

        {/* Success Actions */}
        <div className="text-center">
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Continue to sign in
          </Link>
        </div>

        {/* Security reminder */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">Security reminder:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Your new password is now active</li>
              <li>Consider enabling two-factor authentication for extra security</li>
              <li>Use a unique password for this account</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* No Token Error */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Invalid reset link
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <div className="text-center">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Reset password form">
        {/* Server Error Display */}
        {error && 'data' in error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Password reset failed
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{(error as any).data?.message || 'An unexpected error occurred'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Token validation error */}
        {errors.token && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
            <div className="text-sm text-red-700">
              <p className="font-medium">{errors.token.message}</p>
              <p className="mt-1">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="font-medium text-red-600 hover:text-red-500 underline"
                >
                  Request a new reset link
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Hidden token field */}
        <input {...register('token')} type="hidden" />

        {/* New Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : 'password-help'}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200 ${
                errors.password
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                  : touchedFields.password && !errors.password
                  ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              placeholder="Enter your new password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
            Confirm New Password
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
              placeholder="Confirm your new password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={!isValid || isLoading || passwordStrength.score < 3}
            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
              !isValid || isLoading || passwordStrength.score < 3
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                <span>Resetting password...</span>
              </div>
            ) : (
              'Reset password'
            )}
          </button>
          {passwordStrength.score < 3 && watchedPassword && (
            <p className="mt-2 text-xs text-center text-gray-500">
              Password must be at least "Good" strength to continue
            </p>
          )}
        </div>

        {/* Back to login link */}
        <div className="text-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors duration-200"
          >
            Back to login
          </Link>
        </div>

        {/* Development Mode Indicators */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800">Development Info</h4>
            <div className="mt-2 text-xs text-yellow-700 space-y-1">
              <p>Form Valid: {isValid ? '✅' : '❌'}</p>
              <p>Token: {token ? '✅ Present' : '❌ Missing'}</p>
              <p>Password Strength: {passwordStrength.score}/5</p>
              <p>Loading: {isLoading ? '⏳' : '✅'}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ResetPasswordForm;