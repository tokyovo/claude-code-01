import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/design-system';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks/redux';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="mx-auto max-w-max">
        <main className="sm:flex">
          <p className="text-4xl font-bold tracking-tight text-indigo-600 sm:text-5xl">404</p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Page not found
              </h1>
              <p className="mt-1 text-base text-gray-500">
                Sorry, we couldn't find the page you're looking for.
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              <Button variant="primary" onClick={handleGoBack}>
                Go back
              </Button>
              <Link to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME}>
                <Button variant="outline">
                  {isAuthenticated ? 'Go to Dashboard' : 'Go home'}
                </Button>
              </Link>
            </div>
          </div>
        </main>
        
        {/* Helpful Links */}
        {isAuthenticated && (
          <div className="mt-16">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Popular pages
            </h2>
            <ul className="mt-4 divide-y divide-gray-200 border-t border-b border-gray-200">
              <li className="relative flex items-start space-x-4 py-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    <Link to={ROUTES.TRANSACTIONS} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Transactions
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-500">View and manage your transactions</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </li>
              <li className="relative flex items-start space-x-4 py-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    <Link to={ROUTES.BUDGETS} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Budgets
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-500">Create and track your budgets</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </li>
              <li className="relative flex items-start space-x-4 py-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    <Link to={ROUTES.REPORTS} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Reports
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-500">Analyze your financial data</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;