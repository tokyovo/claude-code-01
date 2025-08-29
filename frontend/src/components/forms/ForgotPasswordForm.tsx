import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../../store/api/apiSlice';
import { ROUTES } from '../../constants';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../utils/validation';

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
  className?: string;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  onSuccess, 
  className = '' 
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();

  // Form management with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    getValues,
    setError,
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const result = await forgotPassword(data).unwrap();
      
      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess(data.email);
      }
    } catch (err: any) {
      // Handle different error types
      if (err.status === 404) {
        setError('email', {
          type: 'server',
          message: 'No account found with this email address'
        });
      } else if (err.status === 429) {
        setError('email', {
          type: 'server',
          message: 'Too many requests. Please wait before trying again.'
        });
      } else if (err.data?.message) {
        setError('email', {
          type: 'server',
          message: err.data.message
        });
      } else {
        setError('email', {
          type: 'server',
          message: 'Failed to send reset email. Please try again.'
        });
      }
    }
  };

  // Handle retry
  const handleRetry = () => {
    setIsSubmitted(false);
    reset();
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
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to{' '}
            <span className="font-medium text-gray-900">{getValues('email')}</span>
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">What's next?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Check your inbox for a password reset email</li>
              <li>Click the reset link in the email (it expires in 15 minutes)</li>
              <li>Create a new secure password</li>
              <li>Sign in with your new password</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Try different email
          </button>
          <Link
            to={ROUTES.LOGIN}
            className="flex-1 px-4 py-2 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Back to login
          </Link>
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-gray-500">
          Didn't receive an email? Check your spam folder or contact support if the problem persists.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Forgot password form">
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

        {/* Email Field */}
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              {...register('email')}
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
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
              disabled={isLoading}
            />
          </div>
          {errors.email ? (
            <p className="mt-1 text-sm text-red-600" id="email-error" role="alert">
              {errors.email.message}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500" id="email-help">
              We'll send a password reset link to this email
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
              !isValid || isLoading
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
                <span>Sending reset link...</span>
              </div>
            ) : (
              'Send reset link'
            )}
          </button>
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

        {/* Security note */}
        <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">Security note:</p>
            <p>
              Password reset links expire in 15 minutes for security. 
              If you don't receive an email, check your spam folder.
            </p>
          </div>
        </div>

        {/* Development Mode Indicators */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800">Development Info</h4>
            <div className="mt-2 text-xs text-yellow-700 space-y-1">
              <p>Form Valid: {isValid ? '✅' : '❌'}</p>
              <p>Email: {getValues('email') || 'Empty'}</p>
              <p>Loading: {isLoading ? '⏳' : '✅'}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ForgotPasswordForm;