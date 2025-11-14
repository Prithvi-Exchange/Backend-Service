const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB, sequelize } = require('./src/config/database');
const { setupAssociations } = require('./src/models/associations/associations');
const { sessionTracker } = require('./src/middleware/customerSession/sessionTracker');
const swaggerSpec = require('./src/config/swagger');
const { errorHandler, notFound } = require('./src/middleware/errorValidation/error');

// Route imports (placeholders - ensure these files exist in your repo)
const authRoutes = require('./src/routes/auth/auth');
const userRoutes = require('./src/routes/user/user');
const currencyRoutes = require('./src/routes/currency/currency');
const forexRoutes = require('./src/routes/currencyRequest/currencyRequest');
const stockRoutes = require('./src/routes/stock/stock');
const markupRoutes = require('./src/routes/markup/MarkupFee');
const documentUploadRoutes = require('./src/routes/documentUpload/documentUpload');
const customerSessionRoutes = require('./src/routes/customerSession/customerSession');
const customerEventRoutes = require('./src/routes/customerEvent/customerEvent');

const app = express();

// Connect to DB and setup associations (async safety)
// app.js (snippet)
(async () => {
  try {
    const ok = await connectDB();
    if (!ok) {
      console.warn('Initial DB setup failed — continuing without DB. Health checks will show DB status.');
    } else {
      await setupAssociations();
    }
  } catch (err) {
    console.error('Initial DB setup error:', err);
    // Continue — do not throw or exit in serverless
  }
})();


// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests from this IP, please try again later.', type: 'RATE_LIMIT_ERROR' }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use(generalLimiter);

// Session tracking middleware
app.use(async (req, res, next) => {
  try {
    await sessionTracker(req, res, next);
  } catch (error) {
    console.error('Session tracker error:', error);
    if (!req.sessionId) req.sessionId = `sess_fallback_${Date.now()}`;
    next();
  }
});

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes (ensure these route modules export express.Router)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forex', forexRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/markup', markupRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/documents', documentUploadRoutes);
app.use('/api/customer-sessions', customerSessionRoutes);
app.use('/api/customer-events', customerEventRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Root page
app.get('/', (req, res) => {
  res.send(`<html>
    <head><title>API</title></head>
    <body style="font-family:Arial,Helvetica,sans-serif;text-align:center;padding:40px;">
      <h1>Prithvi Exchange API</h1>
      <p>Server running on port ${process.env.PORT || 3000}</p>
      <p><a href="/api-docs">API Docs</a></p>
    </body>
  </html>`);
});

// Health endpoints
app.get('/api/health/db', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({ success: true, status: 'OK', database: 'Connected', timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

app.get('/api/health/session', (req, res) => {
  res.json({ success: true, status: 'OK', sessionId: req.sessionId || 'not_set', timestamp: new Date().toISOString() });
});

// 404 + error middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
