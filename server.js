// server.js
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

// Export app for Vercel's serverless environment
module.exports = app;

// If run directly (node server.js), start the HTTP server (useful locally)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });

  // Graceful shutdown handlers
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
  });
}
