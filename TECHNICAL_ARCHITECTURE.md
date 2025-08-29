# Personal Finance Tracker - Technical Architecture

## High-Level System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   React/TS      │◄──►│   Node.js/      │◄──►│   PostgreSQL    │
│   Redux Toolkit │    │   Express       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Caching       │              │
         └──────────────►│   Redis         │◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   File Storage  │
                        │   S3/Local      │
                        └─────────────────┘
```

## Technology Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **UI Components**: Custom components with Tailwind CSS
- **Charts/Visualization**: Chart.js or D3.js
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite
- **Testing**: Jest, React Testing Library, Playwright

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi or Zod
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Process Management**: PM2

### Database & Storage
- **Primary Database**: PostgreSQL 14+
- **Caching**: Redis 7+
- **File Storage**: AWS S3 or local filesystem
- **Database Migration**: Knex.js migrations
- **Connection Pooling**: pg-pool

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Process Monitoring**: PM2, Winston logging
- **CI/CD**: GitHub Actions
- **Environment Management**: Docker environments

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### categories
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- hex color code
    icon VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    parent_category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
```

#### transactions
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recurring_transaction_id INTEGER REFERENCES recurring_transactions(id),
    receipt_url VARCHAR(500),
    notes TEXT,
    tags TEXT[], -- PostgreSQL array for tags
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_amount ON transactions(amount);
```

#### budgets
```sql
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(10,2) NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rollover_unused BOOLEAN DEFAULT FALSE,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_threshold CHECK (alert_threshold > 0 AND alert_threshold <= 1),
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_period ON budgets(start_date, end_date);
CREATE INDEX idx_budgets_category ON budgets(category_id);
```

#### recurring_transactions
```sql
CREATE TABLE recurring_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
    description TEXT,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for indefinite
    next_execution_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_execution ON recurring_transactions(next_execution_date, is_active);
```

### Indexes for Performance
```sql
-- Composite indexes for common queries
CREATE INDEX idx_transactions_user_date_type ON transactions(user_id, transaction_date, transaction_type);
CREATE INDEX idx_transactions_user_category_date ON transactions(user_id, category_id, transaction_date);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, start_date, end_date);

-- Full-text search on descriptions
CREATE INDEX idx_transactions_description_fts ON transactions USING GIN(to_tsvector('english', description));
```

## API Specification

### Authentication Endpoints

#### POST /api/auth/register
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "userId": 123
}
```

#### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Transaction Endpoints

#### GET /api/transactions
Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)
- `category`: Category ID filter
- `type`: Transaction type filter
- `startDate`: Date range start (YYYY-MM-DD)
- `endDate`: Date range end (YYYY-MM-DD)
- `search`: Search term for description

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "amount": 25.99,
        "type": "expense",
        "description": "Coffee shop",
        "date": "2024-01-15",
        "category": {
          "id": 5,
          "name": "Food & Dining",
          "color": "#FF6B6B"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "pages": 25
    }
  }
}
```

#### POST /api/transactions
```json
{
  "amount": 25.99,
  "type": "expense",
  "description": "Coffee shop",
  "date": "2024-01-15",
  "categoryId": 5,
  "tags": ["coffee", "morning"],
  "receiptFile": "base64_encoded_image_data"
}
```

### Budget Endpoints

#### GET /api/budgets/current
**Response:**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": 1,
        "category": {
          "id": 5,
          "name": "Food & Dining"
        },
        "budgetAmount": 500.00,
        "spentAmount": 342.50,
        "remainingAmount": 157.50,
        "percentageUsed": 68.5,
        "daysRemaining": 12,
        "isOverBudget": false,
        "alertThreshold": 80
      }
    ],
    "totalBudget": 2500.00,
    "totalSpent": 1876.25,
    "savingsRate": 24.95
  }
}
```

### Analytics Endpoints

#### GET /api/analytics/spending-trends
Query Parameters:
- `period`: 'month', 'quarter', 'year'
- `groupBy`: 'category', 'type', 'day', 'week', 'month'

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "period": "2024-01",
        "totalSpent": 1876.25,
        "categories": [
          {
            "categoryId": 5,
            "categoryName": "Food & Dining",
            "amount": 342.50,
            "percentage": 18.3
          }
        ]
      }
    ],
    "summary": {
      "averageMonthlySpending": 1956.75,
      "highestSpendingMonth": "2024-03",
      "topCategory": "Food & Dining"
    }
  }
}
```

## Security Framework

### Authentication & Authorization
- **JWT Tokens**: 15-minute access tokens, 7-day refresh tokens
- **Token Storage**: HTTP-only cookies for refresh tokens, memory storage for access tokens
- **Password Security**: bcrypt with salt rounds = 12
- **Rate Limiting**: 5 failed login attempts per IP per 15 minutes
- **Session Management**: Secure session invalidation on logout

### Data Protection
- **Encryption at Rest**: AES-256 encryption for sensitive fields
- **Transport Security**: TLS 1.3 enforced for all endpoints
- **Input Validation**: Server-side validation with sanitization
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: SameSite cookies and CSRF tokens

### API Security
```javascript
// Security middleware stack
app.use(helmet()); // Security headers
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Performance Optimization

### Database Optimization
- **Connection Pooling**: Max 20 connections per instance
- **Query Optimization**: Proper indexing on frequently queried columns
- **Pagination**: Cursor-based pagination for large datasets
- **Read Replicas**: Separate read/write database connections for scaling

### Caching Strategy
```javascript
// Redis caching layers
const cacheStrategies = {
  userProfile: '1 hour',
  categories: '24 hours',
  budgetSummary: '15 minutes',
  transactionSummary: '5 minutes'
};

// Cache invalidation on data changes
const invalidateUserCache = (userId) => {
  redis.del(`user:${userId}:profile`);
  redis.del(`user:${userId}:budgets`);
  redis.del(`user:${userId}:summary`);
};
```

### Frontend Performance
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Defer loading of non-critical components
- **Memoization**: React.memo and useMemo for expensive calculations
- **Virtual Scrolling**: For large transaction lists
- **Image Optimization**: WebP format with fallbacks for receipts

## Monitoring & Observability

### Logging Strategy
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'finance-tracker-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Metrics Collection
- **Application Metrics**: Response times, error rates, throughput
- **Business Metrics**: Transaction volumes, user engagement, budget adherence
- **System Metrics**: CPU, memory, disk usage, database connections
- **User Experience**: Page load times, interaction response times

### Health Checks
```javascript
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      storage: await checkStorage()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'up');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## Deployment Architecture

### Docker Configuration

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://backend:3000

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/financedb
      - REDIS_URL=redis://redis:6379

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=financedb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: Deploy Personal Finance Tracker

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
      - run: npm run lint
      - run: npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker images
        run: |
          docker-compose build
          docker-compose push
      - name: Deploy to production
        run: |
          # Deployment commands here
```

This technical architecture provides a solid foundation for building a scalable, secure, and maintainable personal finance tracking application.