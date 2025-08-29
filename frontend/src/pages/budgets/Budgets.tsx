import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/design-system';
import { ROUTES } from '@/constants';

const Budgets: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Budgets
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your spending limits and track budget performance
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link to={ROUTES.BUDGET_NEW}>
            <Button variant="primary">
              Create Budget
            </Button>
          </Link>
        </div>
      </div>

      {/* Budget Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Sample Budget Card - Replace with actual data */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Monthly Expenses</h3>
              <p className="text-sm text-gray-500">January 2024</p>
            </div>
            <div className="flex items-center">
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">$1,250</p>
                <p className="text-xs text-gray-500">of $2,000</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '62.5%' }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>62.5% used</span>
              <span>$750 remaining</span>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Link 
              to={ROUTES.BUDGET_DETAIL.replace(':id', '1')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View details →
            </Link>
          </div>
        </Card>

        {/* Add more sample cards or replace with actual budget data */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Food & Dining</h3>
              <p className="text-sm text-gray-500">January 2024</p>
            </div>
            <div className="flex items-center">
              <div className="text-right">
                <p className="text-sm font-medium text-yellow-600">$480</p>
                <p className="text-xs text-gray-500">of $500</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '96%' }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>96% used</span>
              <span>$20 remaining</span>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Link 
              to={ROUTES.BUDGET_DETAIL.replace(':id', '2')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View details →
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Entertainment</h3>
              <p className="text-sm text-gray-500">January 2024</p>
            </div>
            <div className="flex items-center">
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">$320</p>
                <p className="text-xs text-gray-500">of $200</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>160% used</span>
              <span>$120 over budget</span>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Link 
              to={ROUTES.BUDGET_DETAIL.replace(':id', '3')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View details →
            </Link>
          </div>
        </Card>
      </div>

      {/* Empty State - Show when no budgets exist */}
      {/* <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first budget.
        </p>
        <div className="mt-6">
          <Link to={ROUTES.BUDGET_NEW}>
            <Button variant="primary">Create Budget</Button>
          </Link>
        </div>
      </div> */}
    </div>
  );
};

export default Budgets;