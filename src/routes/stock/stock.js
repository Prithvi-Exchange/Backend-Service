const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');
const {
  validateStock,
  getStockLevels,
  updateStock
} = require('../../controllers/stock/stockController');

// Validate stock availability
router.post('/validate', authenticate, validateStock);

// Get stock levels (Admin only)
router.get('/levels', authenticate, requireAdmin, getStockLevels);

// Update stock levels (Admin only)
router.put('/:id', authenticate, requireAdmin, updateStock);

module.exports = router;