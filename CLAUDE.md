# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Personal Finance Tracker** web application - a comprehensive financial management system for expense tracking, budgeting, and financial analytics. The project is currently in the **planning and documentation phase** with no code implementation yet.

## Architecture & Technology Stack

### System Architecture
- **Frontend**: React 18 + TypeScript + Redux Toolkit + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + JWT authentication
- **Database**: PostgreSQL 14+ with Knex.js migrations
- **Caching**: Redis 7+
- **File Storage**: AWS S3 or local filesystem
- **Testing**: Jest, React Testing Library, Playwright
- **Build**: Vite for frontend, PM2 for backend process management

### Key Components
- **User Management**: Authentication, profiles, JWT refresh tokens
- **Transaction System**: CRUD operations, categorization, receipt uploads, search/filtering
- **Budget Management**: Budget creation, progress tracking, alerts, rollover functionality
- **Analytics Dashboard**: Interactive charts (Chart.js), spending trends, financial insights
- **Testing Framework**: Multi-layer testing pyramid (70% unit, 20% integration, 10% E2E)

## Development Workflow

### Agent-Based Development Model
This project uses **5 specialized agents** for coordinated development:

1. **backend-api-developer**: Server architecture, APIs, database, security
2. **react-frontend-developer**: UI components, state management, user experience  
3. **ui-ux-designer**: Design systems, responsive design, accessibility
4. **testing-specialist**: Unit/integration testing, quality assurance
5. **playwright-ui-tester**: E2E testing, cross-browser validation, workflow testing

### Task Status Tracking
All tasks use status indicators for progress tracking:
- ⏸️ Not Started | 🔄 In Progress | ✅ Completed | ⚠️ Blocked | 🔍 Under Review

Update task status in `TASK_BREAKDOWN.md` as work progresses.

### Development Phases
1. **Infrastructure Foundation** - Project setup, auth, basic components
2. **User Authentication System** - Registration, login, JWT management
3. **Transaction Management** - CRUD operations, categorization, search
4. **Budget Management** - Budget creation, calculations, alerts
5. **Dashboard & Analytics** - Charts, insights, data visualization
6. **Integration & Testing** - Comprehensive testing, deployment prep

## Security Requirements

### Critical Security Considerations
- **Financial Data Protection**: AES-256 encryption at rest, TLS 1.3 in transit
- **Authentication**: JWT with 15-minute access tokens, HTTP-only refresh cookies
- **Input Validation**: Server-side validation for all financial data
- **Monetary Precision**: Zero tolerance for calculation errors, use decimal libraries
- **No Sensitive Data Logging**: Never log passwords, tokens, or financial amounts

### Testing Requirements
- **Unit Tests**: 85% minimum code coverage
- **Integration Tests**: 100% API endpoint coverage
- **E2E Tests**: 100% critical user journey coverage
- **Financial Accuracy**: 100% monetary calculation validation
- **Security Tests**: Authentication, authorization, data privacy validation

## File Structure & Documentation

### Key Documentation Files
- `PRD.md` - Product requirements, user stories, acceptance criteria
- `TECHNICAL_ARCHITECTURE.md` - System design, database schema, API specifications
- `TASK_BREAKDOWN.md` - Sequential development plan with agent assignments
- `TESTING_STRATEGY.md` - Multi-layer testing framework and quality gates  
- `UI_TESTER_SUBAGENT_SPEC.md` - Playwright testing automation specification

### Database Schema Structure
- **users** - User accounts, authentication, profile data
- **categories** - Transaction categorization system
- **transactions** - Financial transaction records with relationships
- **budgets** - Budget definitions, periods, alert thresholds
- **recurring_transactions** - Automated recurring transaction templates

## Development Guidelines

### Code Quality Standards
- TypeScript strict mode for all code
- Comprehensive error handling for financial operations
- Proper validation for all monetary amounts (2 decimal precision)
- RESTful API design with consistent response formats
- Component-based frontend architecture with reusable UI elements

### Testing Strategy
- **Financial Calculations**: Test all monetary operations with precision validation
- **User Workflows**: E2E testing for registration, login, transaction entry, budget creation
- **Cross-Browser**: Validation across Chrome, Firefox, Safari, Edge
- **Mobile Responsiveness**: Test on multiple device viewports
- **Accessibility**: WCAG 2.1 AA compliance testing

### Performance Requirements
- Page load times < 2 seconds
- API response times < 500ms
- Chart rendering < 3 seconds with 1 year of data
- Support 1,000+ concurrent users
- Database query optimization with proper indexing

## Current Status

**Project Status**: Planning/Documentation Phase
- All core documentation completed
- Technical architecture defined
- Sequential development plan established
- No code implementation has started yet

**Next Steps**: 
1. Initialize backend Node.js/Express project (Task BE-001)
2. Initialize frontend React project (Task FE-001)
3. Setup design system structure (Task UX-001)

Refer to `TASK_BREAKDOWN.md` for the complete sequential development plan with agent assignments and dependencies.