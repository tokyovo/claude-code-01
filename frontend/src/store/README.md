# Redux Toolkit with RTK Query Setup

This document explains the comprehensive state management setup for the Personal Finance Tracker using Redux Toolkit and RTK Query.

## Overview

The state management is organized into the following structure:
- **Store Configuration** (`store/index.ts`)
- **API Slice** (`store/api/apiSlice.ts`) - RTK Query for all backend communication
- **Auth Slice** (`store/slices/authSlice.ts`) - User authentication state
- **UI Slice** (`store/slices/uiSlice.ts`) - App-wide UI state
- **Typed Hooks** (`hooks/redux.ts`) - Type-safe hooks for accessing state
- **Type Definitions** (`types/api.ts`, `types/common/index.ts`) - TypeScript interfaces

## Key Features

### 🔐 Authentication Management
- JWT token handling with automatic refresh
- Session management with activity tracking
- Secure localStorage persistence
- Auto-logout on token expiry

### 🌐 API Communication
- Comprehensive RTK Query setup for all endpoints
- Intelligent caching with tag-based invalidation
- Optimistic updates for better UX
- Centralized error handling
- Automatic re-authentication on 401 errors

### 🎨 UI State Management
- Global loading states
- Notification system with auto-dismiss
- Modal management
- Theme preferences (light/dark)
- Filter states for different views
- Sidebar and layout state

### 🔧 Developer Experience
- Fully typed with TypeScript
- Redux DevTools integration
- Custom hooks for common operations
- Comprehensive error handling
- Performance optimized caching

## Usage Examples

### Authentication

```tsx
import { useAuth, useNotifications } from '@/hooks/redux';
import { useLoginMutation } from '@/store/api/apiSlice';

const LoginComponent = () => {
  const [login, { isLoading }] = useLoginMutation();
  const { showSuccess, showError } = useNotifications();
  const { isAuthenticated } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials).unwrap();
      showSuccess('Login Successful', 'Welcome back!');
    } catch (error) {
      showError('Login Failed', error.message);
    }
  };

  // Component renders based on authentication state
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <form onSubmit={handleLogin}>
      {/* Login form */}
    </form>
  );
};
```

### Data Fetching

```tsx
import { useGetTransactionsQuery, useCreateTransactionMutation } from '@/store/api/apiSlice';
import { useNotifications, useFilters } from '@/hooks/redux';

const TransactionsComponent = () => {
  const { filters } = useFilters('transactions');
  const { showSuccess, showError } = useNotifications();
  
  // Fetch transactions with filters
  const {
    data: transactionsData,
    error,
    isLoading,
    refetch
  } = useGetTransactionsQuery({
    page: 1,
    limit: 10,
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  // Create transaction mutation
  const [createTransaction, { isLoading: isCreating }] = useCreateTransactionMutation();

  const handleCreateTransaction = async (transactionData) => {
    try {
      await createTransaction(transactionData).unwrap();
      showSuccess('Transaction Created', 'Your transaction has been saved.');
      // Data will be automatically updated due to cache invalidation
    } catch (error) {
      showError('Failed to Create Transaction', error.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading transactions</div>;

  return (
    <div>
      {/* Transaction list and creation form */}
      {transactionsData?.transactions.map(transaction => (
        <div key={transaction.id}>{transaction.description}</div>
      ))}
    </div>
  );
};
```

### Notifications

```tsx
import { useNotifications } from '@/hooks/redux';

const SomeComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  const handleAction = () => {
    showSuccess('Success!', 'Operation completed successfully');
    
    // With custom duration
    showWarning('Warning', 'Please review your data', 10000); // 10 seconds
    
    // With action buttons
    showError('Error occurred', 'Failed to save data', {
      actions: [
        { label: 'Retry', action: () => handleRetry() },
        { label: 'Cancel', action: () => {} }
      ]
    });
  };

  return <button onClick={handleAction}>Trigger Notification</button>;
};
```

### Modal Management

```tsx
import { useModal } from '@/hooks/redux';

const ComponentWithModal = () => {
  const { openModal, closeModal, isModalOpen } = useModal();

  const openEditModal = (data) => {
    openModal('editTransaction', data, {
      size: 'lg',
      closable: true,
      position: 'center'
    });
  };

  const handleSave = (updatedData) => {
    // Save logic
    closeModal();
  };

  return (
    <div>
      <button onClick={() => openEditModal(someData)}>
        Edit Transaction
      </button>
      
      {isModalOpen('editTransaction') && (
        <EditTransactionModal onSave={handleSave} onCancel={closeModal} />
      )}
    </div>
  );
};
```

### Loading States

```tsx
import { useLoading } from '@/hooks/redux';

const ComponentWithLoading = () => {
  const { 
    loading, 
    setLoading, 
    isTransactionsLoading, 
    isGlobalLoading 
  } = useLoading();

  const handleLongOperation = async () => {
    setLoading('transactions', true);
    try {
      await performLongOperation();
    } finally {
      setLoading('transactions', false);
    }
  };

  return (
    <div>
      {isGlobalLoading && <GlobalLoadingSpinner />}
      {isTransactionsLoading && <div>Loading transactions...</div>}
      <button 
        onClick={handleLongOperation}
        disabled={isTransactionsLoading}
      >
        Perform Operation
      </button>
    </div>
  );
};
```

### Filters

```tsx
import { useFilters } from '@/hooks/redux';

const FilterableList = () => {
  const {
    filters,
    setSearch,
    setSorting,
    addFilter,
    removeFilter,
    resetFilters,
    hasActiveFilters
  } = useFilters('transactions');

  return (
    <div>
      <input
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search transactions..."
      />
      
      <select onChange={(e) => setSorting(e.target.value, 'desc')}>
        <option value="date">Sort by Date</option>
        <option value="amount">Sort by Amount</option>
        <option value="description">Sort by Description</option>
      </select>
      
      <button onClick={() => addFilter('type', 'EXPENSE')}>
        Show Expenses Only
      </button>
      
      {hasActiveFilters && (
        <button onClick={resetFilters}>Clear Filters</button>
      )}
    </div>
  );
};
```

## API Endpoints

The API slice provides hooks for all backend endpoints:

### Authentication
- `useLoginMutation()` - User login
- `useRegisterMutation()` - User registration
- `useLogoutMutation()` - User logout
- `useRefreshTokenMutation()` - Token refresh

### User Management
- `useGetProfileQuery()` - Get user profile
- `useUpdateProfileMutation()` - Update profile
- `useChangePasswordMutation()` - Change password

### Transactions
- `useGetTransactionsQuery()` - Get transactions with filters
- `useGetTransactionQuery(id)` - Get single transaction
- `useCreateTransactionMutation()` - Create transaction
- `useUpdateTransactionMutation()` - Update transaction
- `useDeleteTransactionMutation()` - Delete transaction

### Categories
- `useGetCategoriesQuery()` - Get all categories
- `useGetCategoryQuery(id)` - Get single category
- `useCreateCategoryMutation()` - Create category
- `useUpdateCategoryMutation()` - Update category
- `useDeleteCategoryMutation()` - Delete category

### Budgets
- `useGetBudgetsQuery()` - Get all budgets
- `useGetBudgetQuery(id)` - Get single budget
- `useCreateBudgetMutation()` - Create budget
- `useUpdateBudgetMutation()` - Update budget
- `useDeleteBudgetMutation()` - Delete budget

### Accounts
- `useGetAccountsQuery()` - Get all accounts
- `useGetAccountQuery(id)` - Get single account
- `useCreateAccountMutation()` - Create account
- `useUpdateAccountMutation()` - Update account
- `useDeleteAccountMutation()` - Delete account

### Reports
- `useGetReportsQuery(params)` - Get financial reports

## Cache Strategy

The RTK Query setup uses intelligent caching:

1. **Tag-based invalidation**: When data is modified, related cached data is automatically invalidated
2. **Optimistic updates**: UI updates immediately for better UX, with rollback on error
3. **Background refetching**: Stale data is refetched in the background
4. **Selective invalidation**: Only relevant cache entries are invalidated, preserving other data

## Error Handling

The system includes comprehensive error handling:

1. **API errors** are automatically caught and can be displayed via notifications
2. **Authentication errors** (401) trigger automatic token refresh or logout
3. **Network errors** are handled gracefully with user feedback
4. **Validation errors** from the backend are properly formatted for display

## Security Features

- **Token management**: JWT tokens are securely stored and automatically refreshed
- **Session tracking**: User activity is monitored for security
- **Automatic logout**: Sessions expire after inactivity or token expiration
- **CSRF protection**: All API calls include proper headers
- **XSS prevention**: User inputs are properly sanitized

## Performance Optimizations

- **Selective rendering**: Components only re-render when their specific data changes
- **Memoized selectors**: Expensive computations are cached
- **Debounced API calls**: Search and filter operations are debounced
- **Code splitting**: API slice endpoints can be loaded on-demand
- **Bundle optimization**: Unused code is tree-shaken during build

## Development Tools

- **Redux DevTools**: Full state inspection and time-travel debugging
- **TypeScript integration**: Full type safety with IntelliSense
- **Hot reloading**: State persists during development
- **Error boundaries**: Graceful error handling in production

This setup provides a robust, scalable, and developer-friendly foundation for the Personal Finance Tracker application.