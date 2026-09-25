import app from './src/app.js';
import { config } from './src/config/env.js';
import { testDbConnection } from './src/config/db.js';
import { runMigrations } from './src/config/migrate.js';

async function startServer() {
  console.log('🚀 Starting ResQTag Server...');
  console.log(`🌍 Environment: ${config.nodeEnv}`);

  // Test DB & Run Migrations
  const isDbConnected = await testDbConnection();
  if (isDbConnected) {
    try {
      await runMigrations();
    } catch (migErr) {
      console.warn('⚠️ Warning: Auto-migration encountered an error:', migErr.message);
    }
  } else {
    console.warn('⚠️ Server started without active DB connection. Please verify your Aiven/MySQL connection string.');
  }

  const server = app.listen(config.port, () => {
    console.log(`✨ ResQTag Server is running on http://localhost:${config.port}`);
    console.log(`🔒 Allowed Client Origin: ${config.clientUrl}`);
  });

  // Graceful shutdown
  const handleShutdown = () => {
    console.log('\n🛑 Gracefully shutting down ResQTag server...');
    server.close(() => {
      console.log('💤 Process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
