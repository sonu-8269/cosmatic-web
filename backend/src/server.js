import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`===============================================`);
    logger.info(`✨ Cosmetics Web Server running in ${env.NODE_ENV} mode`);
    logger.info(`🚀 Listening on http://localhost:${env.PORT}`);
    logger.info(`🔗 API Base: http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`===============================================`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    logger.info(`${signal} received. Initiating graceful shutdown...`);
    server.close(() => {
      logger.info('HTTP server closed successfully.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds timeout
    setTimeout(() => {
      logger.error('Force shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error(`Server bootstrap failure: ${err.message}`);
  process.exit(1);
});
