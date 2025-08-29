import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input, Card } from '@/design-system';
import { ROUTES } from '@/constants';

const EditBudget: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Fetch existing budget data based on ID
  const [formData, setFormData] = useState({
    name: 'Monthly Expenses',
    amount: '2000',
    period: 'monthly',
    category: 'general',
    description: 'Overall monthly spending limit',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement update budget API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      navigate(ROUTES.BUDGET_DETAIL.replace(':id', id!));
    } catch (error) {
      console.error('Failed to update budget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex mb-2" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-4">
            <li>
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.BUDGETS)}
                className="text-gray-400 hover:text-gray-500 p-0"
              >
                <span className="text-sm font-medium">Budgets</span>
              </Button>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="h-5 w-5 flex-shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="m5.555 17.776 4-16 .894.448-4 16-.894-.448z" />
                </svg>
                <Button
                  variant="ghost"
                  onClick={() => navigate(ROUTES.BUDGET_DETAIL.replace(':id', id!))}
                  className="ml-4 text-gray-400 hover:text-gray-500 p-0"
                >
                  <span className="text-sm font-medium">{formData.name}</span>
                </Button>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="h-5 w-5 flex-shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="m5.555 17.776 4-16 .894.448-4 16-.894-.448z" />
                </svg>
                <span className="ml-4 text-sm font-medium text-gray-500">Edit</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Edit Budget</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your budget settings and limits
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Input
                label="Budget Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Monthly Groceries"
              />
            </div>

            <div>
              <Input
                label="Budget Amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Period
              </label>
              <select
                name="period"
                value={formData.period}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                <option value="general">General</option>
                <option value="food">Food & Dining</option>
                <option value="transportation">Transportation</option>
                <option value="shopping">Shopping</option>
                <option value="entertainment">Entertainment</option>
                <option value="bills">Bills & Utilities</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Budget description or notes..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.BUDGET_DETAIL.replace(':id', id!))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Budget'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditBudget;