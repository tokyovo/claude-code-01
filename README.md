# Personal Finance Tracker API

A robust backend API for the Personal Finance Tracker application built with Node.js, Express.js, and TypeScript.

## Features

- **TypeScript Support**: Fully typed with strict TypeScript configuration
- **Security First**: Helmet, CORS, rate limiting, and input sanitization
- **Error Handling**: Comprehensive error handling with custom error classes
- **Logging**: Structured logging with Morgan and custom request/response logging
- **Health Checks**: Built-in health, readiness, and liveness endpoints
- **Development Tools**: Hot reload, linting, and build scripts
- **Production Ready**: Graceful shutdown, environment configuration, and optimization

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript with strict mode
- **Security**: Helmet, CORS, express-rate-limit
- **Logging**: Morgan, custom logging utilities
- **Development**: Nodemon, ts-node, ESLint

## Project Structure

```
src/
├── config/          # Environment and configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware (security, logging, error handling)
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration.

3. **Development server**:
   ```bash
   npm run dev
   ```

4. **Production build**:
   ```bash
   npm run build
   npm start
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run start:dev` - Start development server with ts-node
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Endpoints

### Health Checks

- **GET /** - API information
- **GET /api/v1** - API root with available endpoints
- **GET /api/v1/health** - Basic health check
- **GET /api/v1/health/ready** - Readiness probe for load balancers
- **GET /api/v1/health/live** - Liveness probe for container orchestrators

### Example Health Check Response

```json
{
  "success": true,
  "message": "Health check successful",
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-29T10:11:13.475Z",
    "uptime": 19,
    "environment": "development",
    "version": "1.0.0",
    "memory": {
      "used": 93,
      "total": 97,
      "percentage": 96
    },
    "system": {
      "platform": "darwin",
      "nodeVersion": "v22.17.0",
      "arch": "arm64"
    }
  },
  "timestamp": "2025-08-29T10:11:13.475Z"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `API_VERSION` | API version | `v1` |
| `API_PREFIX` | API prefix | `/api` |
| `JWT_SECRET` | JWT secret key | Required in production |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level | `info` |

See `.env.example` for all available environment variables.

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request rate limiting
- **Input Sanitization**: XSS protection
- **Error Handling**: Secure error responses
- **JWT**: Authentication support (ready for implementation)

## Development

### Code Style

- ESLint with TypeScript rules
- Prettier integration
- Strict TypeScript configuration

### Testing

Testing framework integration is ready - run:
```bash
npm test
```

### API Documentation

API documentation endpoint is available at `/api/v1/docs` (ready for Swagger/OpenAPI integration).

## Production Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Start with process manager: `pm2 start dist/server.js`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the code style
4. Test your changes
5. Submit a pull request

## License

ISC License