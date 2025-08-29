import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: ROUTES.DASHBOARD },
    { name: 'Transactions', href: ROUTES.TRANSACTIONS },
    { name: 'Categories', href: ROUTES.CATEGORIES },
    { name: 'Reports', href: ROUTES.REPORTS },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={ROUTES.DASHBOARD}>
                <h1 className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                  Personal Finance Tracker
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="ml-4 pl-4 border-l border-gray-300">
                <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
