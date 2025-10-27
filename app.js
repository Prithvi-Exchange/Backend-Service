const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
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
const swaggerSpec = require('./src/config/swagger');

const app = express();

// Connect to database
connectDB();

// Setup model associations
setupAssociations();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors());

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting with different limits for different routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // stricter limit for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
      type: 'RATE_LIMIT_ERROR',
      timestamp: new Date().toISOString()
    }
  }
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use(generalLimiter);

// Session tracking middleware with enhanced error handling
app.use(async (req, res, next) => {
  try {
    await sessionTracker(req, res, next);
  } catch (error) {
    console.error('Session tracker middleware failed:', error);
    // Set a fallback session ID to ensure downstream middleware works
    if (!req.sessionId) {
      req.sessionId = `sess_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    next(); // Continue to next middleware even if session tracking fails
  }
});

// Swagger API documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// Static file serving for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    // Security headers for static files
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Root welcome page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Welcome to API Server</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: white;
          }
          p {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            opacity: 0.9;
          }
          code {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.2rem 0.5rem;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
          }
          .links {
            margin-top: 2rem;
          }
          .links a {
            color: white;
            text-decoration: none;
            margin: 0 1rem;
            padding: 0.5rem 1rem;
            border: 1px solid white;
            border-radius: 5px;
            transition: all 0.3s ease;
          }
          .links a:hover {
            background: white;
            color: #667eea;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Welcome to My API</h1>
          <p>Server is running on port ${process.env.PORT || 2000}</p>
          <p>Use <code>/api/auth</code> and <code>/api/users</code> to access APIs.</p>
          <div class="links">
            <a href="/api-docs" target="_blank">API Documentation</a>
            <a href="/api/health/db" target="_blank">Database Health</a>
            <a href="/api/health/session" target="_blank">Session Health</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Enhanced health check routes
app.get('/api/health/db', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      success: true,
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(new AppError('Database connection failed', 500, 'SERVER_ERROR'));
  }
});

app.get('/api/health/session', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    sessionId: req.sessionId || 'not_set',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for all unmatched routes
app.use(notFound);

// Global error handler - MUST BE LAST MIDDLEWARE
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