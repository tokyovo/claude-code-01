import React, { useMemo } from 'react';
import { useGetTransactionsQuery, useGetReportsQuery } from '@/store/api/apiSlice';
import { useAuth, useNotifications } from '@/hooks/redux';
import { Card } from '@/design-system/components/Card/Card';
import { TransactionType } from '@/types/common';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotifications();
  
  // Get recent transactions
  const { 
    data: transactionsData, 
    error: transactionsError, 
    isLoading: transactionsLoading 
  } = useGetTransactionsQuery({ 
    page: 1, 
    limit: 5, 
    sortBy: 'date', 
    sortOrder: 'desc' 
  });
  
  // Get reports data for current month
  const currentMonth = new Date();
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0] ?? '';
  const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0] ?? '';
  
  const { 
    data: reportsData, 
    error: reportsError, 
    isLoading: reportsLoading 
  } = useGetReportsQuery({ startDate, endDate });
  
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!reportsData) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        transactionCount: 0
      };
    }
    
    const { summary } = reportsData;
    return {
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpense,
      netBalance: summary.balance,
      transactionCount: summary.transactionCount
    };
  }, [reportsData]);
  
  // Handle errors
  React.useEffect(() => {
    if (transactionsError) {
      showError('Failed to load transactions', 'Unable to fetch recent transactions');
    }
    if (reportsError) {
      showError('Failed to load reports', 'Unable to fetch dashboard data');
    }
  }, [transactionsError, reportsError, showError]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your financial activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white font-semibold">$</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Income
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {reportsLoading ? 'Loading...' : `$${summaryStats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span className="text-white font-semibold">-</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Expenses
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {reportsLoading ? 'Loading...' : `$${summaryStats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white font-semibold">=</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Net Balance
                </dt>
                <dd className={`text-lg font-medium ${
                  summaryStats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reportsLoading ? 'Loading...' : `$${summaryStats.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white font-semibold">#</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Transactions
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {reportsLoading ? 'Loading...' : summaryStats.transactionCount.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Transactions
          </h3>
          <div className="mt-5">
            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : transactionsData?.transactions?.length ? (
              <div className="space-y-3">
                {transactionsData.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.type === TransactionType.INCOME 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === TransactionType.INCOME ? '+' : '-'}
                      ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add your first transaction to get started
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Spending by Category
          </h3>
          <div className="mt-5">
            {reportsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading categories...</p>
              </div>
            ) : reportsData?.categoryBreakdown?.expense?.length ? (
              <div className="space-y-3">
                {reportsData.categoryBreakdown.expense.slice(0, 5).map((category) => (
                  <div key={category.categoryId} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.transactionCount} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${category.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No spending data yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add some transactions to see your spending breakdown
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
