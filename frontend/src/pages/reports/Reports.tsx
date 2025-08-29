import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="mt-2 text-sm text-gray-600">
          Analyze your financial data with detailed reports
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reports coming soon
            </h3>
            <p className="text-gray-500">
              Add some transactions to generate insightful reports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
