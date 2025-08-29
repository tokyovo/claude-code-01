# Personal Finance Tracker - Frontend

A modern React application for personal finance management built with TypeScript, Vite, and React Router.

## Features

- 🚀 **Modern Tech Stack**: React 18, TypeScript, Vite
- 🎨 **Clean UI**: Custom CSS with utility classes and responsive design
- 🛡️ **Type Safety**: Strict TypeScript configuration with comprehensive type definitions
- 🔄 **Routing**: React Router with protected routes and authentication flow
- ⚡ **Fast Development**: Hot Module Replacement (HMR) with Vite
- 📱 **Responsive**: Mobile-first design approach
- 🧹 **Code Quality**: ESLint + Prettier with pre-configured rules

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: Custom CSS with utility classes (prepared for Tailwind CSS)
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **State Management**: Prepared for Redux Toolkit (to be added)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   ├── forms/          # Form components
│   ├── ui/             # Basic UI components
│   └── common/         # Shared components
├── pages/              # Page components
│   ├── auth/           # Authentication pages (Login, Register)
│   ├── dashboard/      # Dashboard page
│   ├── transactions/   # Transaction management pages
│   ├── categories/     # Category management pages
│   ├── reports/        # Reports and analytics pages
│   └── common/         # Shared page components
├── hooks/              # Custom React hooks
├── services/           # API services and HTTP client
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # Application constants
├── context/            # React Context providers
└── assets/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts and cache

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Personal Finance Tracker
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=true
```

### Path Aliases

The project is configured with TypeScript path aliases for cleaner imports:

```typescript
import Layout from '@/components/layout/Layout';
import { ROUTES } from '@/constants';
import type { User } from '@/types/common';
```

## Features Implementation Status

### ✅ Completed
- [x] Project setup with Vite and TypeScript
- [x] Routing configuration with React Router
- [x] Basic layout and navigation
- [x] Authentication pages (Login/Register)
- [x] Dashboard page structure
- [x] Page scaffolding for all main features
- [x] TypeScript type definitions
- [x] Utility functions
- [x] ESLint and Prettier configuration
- [x] Build optimization

### 🚧 In Progress / Next Steps
- [ ] Authentication integration with backend API
- [ ] Transaction management (CRUD operations)
- [ ] Category management
- [ ] Dashboard with real data
- [ ] Charts and analytics
- [ ] Redux Toolkit for state management
- [ ] API service layer
- [ ] Custom hooks for data fetching
- [ ] Error handling and loading states
- [ ] Form validation
- [ ] Responsive mobile design refinements
- [ ] Unit tests with React Testing Library
- [ ] E2E tests with Playwright

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow TypeScript strict mode guidelines
- Use absolute imports with path aliases
- Implement proper error boundaries
- Follow React best practices and patterns

### Component Structure
```typescript
// Component template
import React from 'react';
import type { ComponentProps } from '@/types/common';

interface Props extends ComponentProps {
  // Component-specific props
}

const ComponentName: React.FC<Props> = ({ children, ...props }) => {
  // Component logic
  
  return (
    <div {...props}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### State Management
- Use React Context for global state (authentication, theme)
- Redux Toolkit for complex state management (to be implemented)
- Local state with useState for component-specific state
- Custom hooks for shared stateful logic

## API Integration

The frontend is designed to integrate with the Personal Finance Tracker API:

- Base URL: `http://localhost:8000/api`
- Authentication: JWT tokens
- RESTful endpoints for all CRUD operations
- Type-safe API client (to be implemented)

## Contributing

1. Follow the established code style and patterns
2. Use TypeScript strict mode
3. Add appropriate type definitions
4. Run linting and formatting before commits
5. Write meaningful commit messages
6. Test your changes thoroughly

## License

This project is part of the Personal Finance Tracker application.
