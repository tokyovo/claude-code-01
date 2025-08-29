import React from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { ResetPasswordForm } from '../../components/forms';
import { ROUTES } from '../../constants';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Redirect if no token provided
  if (!token) {
    return <Navigate to={ROUTES.FORGOT_PASSWORD} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8" role="main" aria-labelledby="reset-password-title">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 id="reset-password-title" className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below. Make sure it's secure and easy for you to remember.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <ResetPasswordForm />
        </div>

        {/* Security Notice */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Security reminder
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Choose a strong password that you haven't used elsewhere. 
                  This link will expire after 15 minutes for security.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble?{' '}
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors duration-200"
            >
              Request a new reset link
            </Link>{' '}
            or{' '}
            <Link
              to={ROUTES.LOGIN}
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors duration-200"
            >
              return to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;