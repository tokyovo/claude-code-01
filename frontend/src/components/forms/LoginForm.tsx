import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuthActions, useRequireGuest } from '../../hooks/auth';
import { useGetSecurityMetricsQuery } from '../../store/api/apiSlice';
import { ROUTES } from '../../constants';
import { loginSchema, type LoginFormData } from '../../utils/validation';
import { validateEmail } from '../../utils/validation';

const LoginForm: React.FC = () => {
  // Redirect authenticated users
  const { isAllowed } = useRequireGuest();
  
  // Authentication actions
  const { login, isLoginLoading } = useAuthActions();

  // Form management with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields, isSubmitting },
    setError,
    watch,
    clearErrors,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    }
  });

  // Watch form values for UI feedback
  const watchedFields = watch();
  const watchedEmail = watch('email');

  // Get security metrics for the current email
  const shouldFetchSecurity = watchedEmail && validateEmail(watchedEmail);
  const { 
    data: securityMetrics, 
    isLoading: isSecurityLoading,
    error: securityError 
  } = useGetSecurityMetricsQuery(watchedEmail, {
    skip: !shouldFetchSecurity,
    refetchOnMountOrArgChange: true,
  });

  // Memoized security status
  const securityStatus = useMemo(() => {
    if (!securityMetrics) return null;
    
    return {
      isLocked: securityMetrics.isAccountLocked,
      remainingAttempts: securityMetrics.remainingAttempts,
      failedAttempts: securityMetrics.failedLoginAttempts,
      lockoutExpiresAt: securityMetrics.lockoutExpiresAt ? new Date(securityMetrics.lockoutExpiresAt) : null,
      lastLoginAt: securityMetrics.lastLoginAt ? new Date(securityMetrics.lastLoginAt) : null,
      lastFailedLoginAt: securityMetrics.lastFailedLoginAt ? new Date(securityMetrics.lastFailedLoginAt) : null,
    };
  }, [securityMetrics]);

  // Clear errors when email changes
  useEffect(() => {
    if (watchedEmail) {
      clearErrors('email');
    }
  }, [watchedEmail, clearErrors]);

  // Handle form submission with enhanced error handling
  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login({
        email: data.email,
        password: data.password,
      });

      if (!result.success && result.error) {
        // Handle different types of API errors
        const error = result.error;
        
        if (error.status === 401) {
          // Invalid credentials
          setError('password', {
            type: 'server',
            message: 'Invalid email or password'
          });
        } else if (error.status === 423) {
          // Account locked
          setError('email', {
            type: 'server',
            message: 'Account is temporarily locked due to multiple failed login attempts'
          });
        } else if (error.status === 429) {
          // Rate limited
          setError('email', {
            type: 'server',
            message: 'Too many login attempts. Please try again later.'
          });
        } else if (error.data?.field) {
          // Field-specific error
          setError(error.data.field as keyof LoginFormData, {
            type: 'server',
            message: error.data.message
          });
        } else {
          // Generic error
          setError('email', {
            type: 'server',
            message: error.data?.message || 'Login failed. Please try again.'
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('email', {
        type: 'server',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  // Don't render if user is authenticated
  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8" role="main" aria-labelledby="signin-title">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <h2 id="signin-title" className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to Personal Finance Tracker
          </p>
        </div>

        {/* Form */}
        {/* Security Status Alerts */}
        {securityStatus?.isLocked && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.351-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Account Temporarily Locked</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Your account has been locked due to multiple failed login attempts. 
                    {securityStatus.lockoutExpiresAt && (
                      <span> It will be unlocked at {securityStatus.lockoutExpiresAt.toLocaleTimeString()}.</span>
                    )}
                  </p>
                  <p className="mt-1">
                    <Link
                      to={ROUTES.FORGOT_PASSWORD}
                      className="font-medium text-red-600 hover:text-red-500 underline"
                    >
                      Reset your password
                    </Link> if you've forgotten it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {securityStatus && !securityStatus.isLocked && securityStatus.failedAttempts > 0 && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Security Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {securityStatus.failedAttempts} failed login attempt{securityStatus.failedAttempts > 1 ? 's' : ''} detected. 
                    {securityStatus.remainingAttempts} attempt{securityStatus.remainingAttempts !== 1 ? 's' : ''} remaining before account lockout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign in form">
          <input type="hidden" name="remember" defaultValue="true" />
          
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`relative block w-full px-3 py-2 border rounded-t-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors duration-200 ${
                  errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.email && !errors.email
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Email address"
                disabled={isLoginLoading || isSubmitting || securityStatus?.isLocked}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" id="email-error" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`relative block w-full px-3 py-2 border rounded-b-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors duration-200 ${
                  errors.password
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.password && !errors.password
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Password"
                disabled={isLoginLoading || isSubmitting || securityStatus?.isLocked}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" id="password-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                disabled={isLoginLoading || isSubmitting || securityStatus?.isLocked}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                Remember me for 30 days
              </label>
            </div>

            <div className="text-sm">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition duration-200 ease-in-out"
                tabIndex={securityStatus?.isLocked ? -1 : 0}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={!isValid || isLoginLoading || isSubmitting || securityStatus?.isLocked}
              aria-describedby="submit-help"
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out ${
                !isValid || isLoginLoading || isSubmitting || securityStatus?.isLocked
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105'
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {(isLoginLoading || isSubmitting) && (
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
                {!isLoginLoading && !isSubmitting && securityStatus?.isLocked && (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </span>
              {(isLoginLoading || isSubmitting) ? 'Signing in...' : 
               securityStatus?.isLocked ? 'Account Locked' : 'Sign in'}
            </button>
            {securityStatus && !securityStatus.isLocked && securityStatus.failedAttempts > 0 && (
              <p id="submit-help" className="mt-2 text-xs text-center text-gray-600">
                {securityStatus.remainingAttempts} login attempt{securityStatus.remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition duration-150 ease-in-out"
              >
                Sign up here
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
              <p>Email: {watchedFields.email || 'Empty'}</p>
              <p>Password Length: {watchedFields.password?.length || 0}</p>
              <p>Remember Me: {watchedFields.rememberMe ? '✅' : '❌'}</p>
              <p>Loading: {isLoginLoading || isSubmitting ? '⏳' : '✅'}</p>
              {securityStatus && (
                <div className="mt-2 pt-2 border-t border-yellow-300">
                  <p>Security Status:</p>
                  <ul className="ml-4 space-y-1">
                    <li>Locked: {securityStatus.isLocked ? '🔒' : '🔓'}</li>
                    <li>Failed Attempts: {securityStatus.failedAttempts}</li>
                    <li>Remaining: {securityStatus.remainingAttempts}</li>
                    {securityStatus.lastLoginAt && (
                      <li>Last Login: {securityStatus.lastLoginAt.toLocaleString()}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;