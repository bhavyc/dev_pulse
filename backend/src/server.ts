import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { MonitoringScheduler } from './engine/scheduler';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 DevPulse Backend running on http://localhost:${PORT}`);
  logger.info(`🌐 Environment: ${env.NODE_ENV}`);

  // Start autonomous monitoring engine (ticks every 30 seconds)
  if (env.NODE_ENV !== 'test') {
    MonitoringScheduler.start(30000);
  }
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  MonitoringScheduler.stop();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
