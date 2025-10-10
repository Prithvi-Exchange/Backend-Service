const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

const { 
  createMarkupFee, 
  bulkCreateMarkupFees, 
  getMarkupFees, 
  updateMarkupFee, 
  deleteMarkupFee, 
  ensureCityCode 
} = require('../../controllers/markup/MarkupFeeController');

// 1. Create a new Markup Fee
router.post('/', createMarkupFee);

// 2. Bulk create Markup Fees
router.post('/bulk', bulkCreateMarkupFees);

// 3. Get a list of Markup Fees with optional filters
router.get('/', ensureCityCode, getMarkupFees);

// 4. Update an existing Markup Fee by ID
router.put('/:id', updateMarkupFee);

// 5. Delete a Markup Fee by ID
router.delete('/:id', deleteMarkupFee);

module.exports = router;
