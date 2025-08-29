import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks/redux';

const Settings: React.FC = () => {
  const { user } = useAuth();

  const settingsItems = [
    {
      title: 'Profile',
      description: 'Update your personal information and profile details',
      href: ROUTES.SETTINGS_PROFILE,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      title: 'Account Settings',
      description: 'Manage your account details and email preferences',
      href: ROUTES.SETTINGS_ACCOUNT,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: 'Security',
      description: 'Update your password and security settings',
      href: ROUTES.SETTINGS_SECURITY,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: 'Notifications',
      description: 'Configure your notification preferences',
      href: ROUTES.SETTINGS_NOTIFICATIONS,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      ),
    },
    {
      title: 'Preferences',
      description: 'Customize your app preferences and defaults',
      href: ROUTES.SETTINGS_PREFERENCES,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xl font-medium text-gray-700">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400">Member since {new Date().getFullYear()}</p>
          </div>
        </div>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link key={item.href} to={item.href} className="group">
            <Card className="p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                    {item.icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">Export Data</div>
            <div className="text-xs text-gray-500 mt-1">Download your financial data</div>
          </button>
          <button className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">Import Data</div>
            <div className="text-xs text-gray-500 mt-1">Import transactions from CSV</div>
          </button>
          <button className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">Reset Categories</div>
            <div className="text-xs text-gray-500 mt-1">Restore default categories</div>
          </button>
          <button className="text-left p-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors">
            <div className="text-sm font-medium">Delete Account</div>
            <div className="text-xs text-red-500 mt-1">Permanently delete your account</div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;