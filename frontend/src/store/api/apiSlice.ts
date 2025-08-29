// RTK Query API slice for all backend communication
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  // Authentication types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  BackendAuthResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SecurityMetricsResponse,
  
  // User types
  UpdateProfileRequest,
  ChangePasswordRequest,
  
  // Transaction types
  CreateTransactionRequest,
  UpdateTransactionRequest,
  GetTransactionsRequest,
  TransactionsResponse,
  
  // Category types
  CreateCategoryRequest,
  UpdateCategoryRequest,
  
  // Budget types
  CreateBudgetRequest,
  UpdateBudgetRequest,
  
  // Account types
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  
  // Reports types
  ReportsRequest,
  ReportsResponse,
  
  // Generic types
  ApiTags,
} from '../../types/api';
import type {
  User,
  Transaction,
  Category,
  Budget,
} from '../../types/common';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state
    const token = (getState() as RootState).auth.token;
    
    // Set common headers
    headers.set('Content-Type', 'application/json');
    
    // Add authorization header if token exists
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

// Enhanced base query with re-authentication
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 errors - token expired
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    
    if (refreshToken) {
      // Try to refresh token
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Update tokens in state using the action creator
        const { setCredentials } = await import('../slices/authSlice');
        const authData = refreshResult.data as any;
        api.dispatch(setCredentials({
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
          expiresIn: authData.expiresIn,
        }));
        
        // Retry original query with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        const { clearCredentials } = await import('../slices/authSlice');
        api.dispatch(clearCredentials());
      }
    } else {
      // No refresh token, logout user
      const { clearCredentials } = await import('../slices/authSlice');
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

// Main API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Transaction', 'Category', 'Budget', 'Account', 'Reports'] as ApiTags[],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: BackendAuthResponse): AuthResponse => {
        const expiresAt = new Date(response.data.tokens.expiresAt);
        const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        
        return {
          user: response.data.user,
          token: response.data.tokens.accessToken,
          refreshToken: '', // Not provided by current backend
          expiresIn,
        };
      },
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response: BackendAuthResponse): AuthResponse => {
        const expiresAt = response.data.tokens ? new Date(response.data.tokens.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        
        return {
          user: response.data.user,
          token: response.data.tokens?.accessToken || '',
          refreshToken: '', // Not provided by current backend  
          expiresIn,
        };
      },
    }),

    refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (tokenData) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: tokenData,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Transaction', 'Category', 'Budget', 'Account', 'Reports'],
    }),

    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),

    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),

    getSecurityMetrics: builder.query<SecurityMetricsResponse, string>({
      query: (email) => `/auth/security?email=${encodeURIComponent(email)}`,
    }),

    // User endpoints
    getProfile: builder.query<User, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (profileData) => ({
        url: '/users/profile',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation<void, ChangePasswordRequest>({
      query: (passwordData) => ({
        url: '/users/change-password',
        method: 'PUT',
        body: passwordData,
      }),
    }),

    // Transaction endpoints
    getTransactions: builder.query<TransactionsResponse, GetTransactionsRequest>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        // Add pagination
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        
        // Add filters
        if (params.search) queryParams.append('search', params.search);
        if (params.categoryId) queryParams.append('categoryId', params.categoryId);
        if (params.type) queryParams.append('type', params.type);
        if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) queryParams.append('dateTo', params.dateTo);
        
        // Add sorting
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        return `/transactions?${queryParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.transactions.map(({ id }) => ({ type: 'Transaction' as const, id })),
              { type: 'Transaction', id: 'LIST' },
            ]
          : [{ type: 'Transaction', id: 'LIST' }],
    }),

    getTransaction: builder.query<Transaction, string>({
      query: (id) => `/transactions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Transaction', id }],
    }),

    createTransaction: builder.mutation<Transaction, CreateTransactionRequest>({
      query: (transactionData) => ({
        url: '/transactions',
        method: 'POST',
        body: transactionData,
      }),
      invalidatesTags: [
        { type: 'Transaction', id: 'LIST' },
        'Budget',
        'Account',
        'Reports',
      ],
    }),

    updateTransaction: builder.mutation<Transaction, UpdateTransactionRequest>({
      query: ({ id, ...transactionData }) => ({
        url: `/transactions/${id}`,
        method: 'PUT',
        body: transactionData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Transaction', id },
        { type: 'Transaction', id: 'LIST' },
        'Budget',
        'Account',
        'Reports',
      ],
    }),

    deleteTransaction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/transactions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Transaction', id: 'LIST' },
        'Budget',
        'Account',
        'Reports',
      ],
    }),

    // Category endpoints
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
    }),

    getCategory: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Category', id }],
    }),

    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (categoryData) => ({
        url: '/categories',
        method: 'POST',
        body: categoryData,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
      query: ({ id, ...categoryData }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: categoryData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Category', id: 'LIST' },
        { type: 'Transaction', id: 'LIST' },
        'Budget',
      ],
    }),

    // Budget endpoints
    getBudgets: builder.query<Budget[], void>({
      query: () => '/budgets',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Budget' as const, id })),
              { type: 'Budget', id: 'LIST' },
            ]
          : [{ type: 'Budget', id: 'LIST' }],
    }),

    getBudget: builder.query<Budget, string>({
      query: (id) => `/budgets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Budget', id }],
    }),

    createBudget: builder.mutation<Budget, CreateBudgetRequest>({
      query: (budgetData) => ({
        url: '/budgets',
        method: 'POST',
        body: budgetData,
      }),
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }, 'Reports'],
    }),

    updateBudget: builder.mutation<Budget, UpdateBudgetRequest>({
      query: ({ id, ...budgetData }) => ({
        url: `/budgets/${id}`,
        method: 'PUT',
        body: budgetData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Budget', id },
        { type: 'Budget', id: 'LIST' },
        'Reports',
      ],
    }),

    deleteBudget: builder.mutation<void, string>({
      query: (id) => ({
        url: `/budgets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }, 'Reports'],
    }),

    // Account endpoints
    getAccounts: builder.query<Account[], void>({
      query: () => '/accounts',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Account' as const, id })),
              { type: 'Account', id: 'LIST' },
            ]
          : [{ type: 'Account', id: 'LIST' }],
    }),

    getAccount: builder.query<Account, string>({
      query: (id) => `/accounts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Account', id }],
    }),

    createAccount: builder.mutation<Account, CreateAccountRequest>({
      query: (accountData) => ({
        url: '/accounts',
        method: 'POST',
        body: accountData,
      }),
      invalidatesTags: [{ type: 'Account', id: 'LIST' }],
    }),

    updateAccount: builder.mutation<Account, UpdateAccountRequest>({
      query: ({ id, ...accountData }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: accountData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Account', id },
        { type: 'Account', id: 'LIST' },
      ],
    }),

    deleteAccount: builder.mutation<void, string>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Account', id: 'LIST' }],
    }),

    // Reports endpoints
    getReports: builder.query<ReportsResponse, ReportsRequest>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        
        queryParams.append('startDate', params.startDate);
        queryParams.append('endDate', params.endDate);
        
        if (params.categoryIds?.length) {
          params.categoryIds.forEach(id => queryParams.append('categoryIds[]', id));
        }
        
        if (params.accountIds?.length) {
          params.accountIds.forEach(id => queryParams.append('accountIds[]', id));
        }

        return `/reports?${queryParams.toString()}`;
      },
      providesTags: ['Reports'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Authentication hooks
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetSecurityMetricsQuery,
  
  // User hooks
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  
  // Transaction hooks
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  
  // Category hooks
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  
  // Budget hooks
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  
  // Account hooks
  useGetAccountsQuery,
  useGetAccountQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  
  // Reports hooks
  useGetReportsQuery,
} = api;