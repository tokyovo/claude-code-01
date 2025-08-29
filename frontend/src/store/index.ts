// Redux store configuration with RTK Query
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Slices
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';

// API
import { api } from './api/apiSlice';

// Store configuration
export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for RTK Query
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'api/executeMutation/pending',
          'api/executeMutation/fulfilled',
          'api/executeMutation/rejected',
          'api/executeQuery/pending',
          'api/executeQuery/fulfilled',
          'api/executeQuery/rejected',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.timestamp', 'meta.arg.originalArgs'],
        // Ignore these paths in the state
        ignoredPaths: [
          'api.queries',
          'api.mutations',
          'api.subscriptions',
        ],
      },
    }).concat(api.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable listener behavior for the store
setupListeners(store.dispatch);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store instance
export default store;