import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTransactionQuery } from '@/store/api/apiSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/design-system/components/Button/Button';
import { Card } from '@/design-system/components/Card/Card';

export const EditTransaction: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    data: transaction,
    error,
    isLoading
  } = useGetTransactionQuery(id!, {
    skip: !id
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Transaction Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The transaction you're trying to edit doesn't exist or has been deleted.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/transactions')}
            >
              Back to Transactions
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Transaction
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/transactions/${id}`)}
          >
            View Details
          </Button>
          <Button
            variant="outline" 
            onClick={() => navigate('/transactions')}
          >
            Back to List
          </Button>
        </div>
      </div>

      <Card>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Edit Transaction Form
          </h2>
          <p className="text-gray-600 mb-6">
            Transaction editing functionality will be implemented here.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Currently editing: {transaction.description}
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="primary"
              onClick={() => navigate(`/transactions/${id}`)}
            >
              View Details
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/transactions')}
            >
              Back to List
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditTransaction;