import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '@/design-system';
import { ROUTES } from '@/constants';

const BudgetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // TODO: Fetch budget data based on ID
  const budget = {
    id,
    name: 'Monthly Expenses',
    amount: 2000,
    spent: 1250,
    remaining: 750,
    period: 'monthly',
    category: 'General',
    description: 'Overall monthly spending limit',
    transactions: [
      { id: '1', date: '2024-01-15', description: 'Grocery Store', amount: 85.50, category: 'Food' },
      { id: '2', date: '2024-01-14', description: 'Gas Station', amount: 45.00, category: 'Transportation' },
      { id: '3', date: '2024-01-13', description: 'Restaurant', amount: 32.75, category: 'Food' },
    ],
  };

  const percentageUsed = (budget.spent / budget.amount) * 100;
  const isOverBudget = percentageUsed > 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <nav className="flex mb-2" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-4">
              <li>
                <Link to={ROUTES.BUDGETS} className="text-gray-400 hover:text-gray-500">
                  <span className="text-sm font-medium">Budgets</span>
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="h-5 w-5 flex-shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="m5.555 17.776 4-16 .894.448-4 16-.894-.448z" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">{budget.name}</span>
                </div>
              </li>
            </ol>
          </nav>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {budget.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{budget.description}</p>
        </div>
        <div className="mt-4 flex space-x-3 md:ml-4 md:mt-0">
          <Link to={ROUTES.BUDGET_EDIT.replace(':id', budget.id!)}>
            <Button variant="outline">Edit Budget</Button>
          </Link>
          <Button variant="destructive">Delete</Button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Budget Amount</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            ${budget.amount.toLocaleString()}
          </dd>
        </Card>

        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Amount Spent</dt>
          <dd className={`mt-1 text-3xl font-semibold ${isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
            ${budget.spent.toLocaleString()}
          </dd>
        </Card>

        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">
            {isOverBudget ? 'Over Budget' : 'Remaining'}
          </dt>
          <dd className={`mt-1 text-3xl font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            ${Math.abs(budget.remaining).toLocaleString()}
          </dd>
        </Card>

        <Card className="p-6">
          <dt className="text-sm font-medium text-gray-500 truncate">Usage</dt>
          <dd className={`mt-1 text-3xl font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {percentageUsed.toFixed(1)}%
          </dd>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full ${isOverBudget ? 'bg-red-500' : percentageUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{percentageUsed.toFixed(1)}% used</span>
          <span>
            {isOverBudget 
              ? `$${Math.abs(budget.remaining).toLocaleString()} over budget`
              : `$${budget.remaining.toLocaleString()} remaining`
            }
          </span>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          <Link 
            to={`${ROUTES.TRANSACTIONS}?budget=${budget.id}`}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all →
          </Link>
        </div>
        
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {budget.transactions.map((transaction, index) => (
              <li key={transaction.id}>
                <div className="relative pb-8">
                  {index !== budget.transactions.length - 1 && (
                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                        <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{transaction.category}</p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        <div className="font-medium text-gray-900">
                          -${transaction.amount}
                        </div>
                        <div>{transaction.date}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default BudgetDetail;