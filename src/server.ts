import 'module-alias/register';
import App from './app';
import { config } from '@/config/env';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', error.name, error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Create and start the application
const app = new App();

// Start the server
const server = app.getApp().listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📍 Environment: ${config.NODE_ENV}`);
  console.log(`🌐 API Base URL: http://localhost:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}`);
  console.log(`🏥 Health Check: http://localhost:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}/health`);
  
  if (config.NODE_ENV === 'development') {
    console.log('📝 Server ready for development');
    console.log('🔄 Auto-restart enabled via nodemon');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (graceful shutdown)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
    process.exit(0);
  });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
    process.exit(0);
  });
});

export default server;