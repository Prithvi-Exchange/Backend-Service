const express = require('express');
const router = express.Router();
const { 
  getCurrencyRates,
  getDetailedCurrencyRates,
  getCurrencyRatesWithFallback,
  updateCurrencyRates
} = require('../../controllers/currency/currencyController');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

// Public routes
router.get('/rates', getCurrencyRates);
router.get('/rates/detailed', getDetailedCurrencyRates);
router.get('/rates/fallback', getCurrencyRatesWithFallback);

// Admin routes
router.post('/rates/update', authenticate, requireAdmin, updateCurrencyRates);

module.exports = router;