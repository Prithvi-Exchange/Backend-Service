const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB, sequelize } = require('./src/config/database');
const { setupAssociations } = require('./src/models/associations/associations');
const authRoutes = require('./src/routes/auth/auth');
const userRoutes = require('./src/routes/user/user');
const { errorHandler, notFound } = require('./src/middleware/errorValidation/error');
const currencyRoutes = require('./src/routes/currency/currency');
const forexRoutes = require('./src/routes/currencyRequest/currencyRequest');
const stockRoutes = require('./src/routes/stock/stock');
const markupRoutes = require('./src/routes/markup/MarkupFee');
const documentUploadRoutes = require('./src/routes/documentUpload/documentUpload');
const customerSessionRoutes = require('./src/routes/customerSession/customerSession');
const customerEventRoutes = require('./src/routes/customerEvent/customerEvent');
const { sessionTracker } = require('./src/middleware/customerSession/sessionTracker');

const app = express();

// Connect to database
connectDB();

// Setup model associations
setupAssociations();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Session tracking middleware with error handling wrapper
app.use((req, res, next) => {
  const sessionTrackingWrapper = async (req, res, next) => {
    try {
      await sessionTracker(req, res, next);
    } catch (error) {
      console.error('Session tracker middleware failed:', error);
      // Set a fallback session ID to ensure downstream middleware works
      if (!req.sessionId) {
        req.sessionId = `sess_fallback_${Date.now()}`;
      }
      next();
    }
  };
  
  sessionTrackingWrapper(req, res, next);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forex', forexRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/markup', markupRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/documents', documentUploadRoutes);
app.use('/api/customer-sessions', customerSessionRoutes);
app.use('/api/customer-events', customerEventRoutes);

// Add static file serving for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root welcome page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Welcome</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 100px;
            background: #f4f4f9;
            color: #333;
          }
          h1 {
            color: #4CAF50;
          }
          p {
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <h1>🚀 Welcome to My API</h1>
        <p>Server is running on port ${process.env.PORT || 3000}</p>
        <p>Use <code>/api/auth</code> and <code>/api/users</code> to access APIs.</p>
      </body>
    </html>
  `);
});

// Health check route
app.get('/api/health/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// Health check for session tracking
app.get('/api/health/session', (req, res) => {
  res.status(200).json({
    status: 'OK',
    sessionId: req.sessionId || 'not_set',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for all unmatched routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;