const { MarkupFee } = require('../../models/markup/MarkupFee');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');
const { getPaginationParams, createPaginationMetadata } = require('../../middleware/response/pagination');

/**
 * Map product types to transaction types for stock lookup
 * This ensures we check the correct MarkupFee record for stock validation
 * @param {string} product - Product type from forex request
 * @returns {string} Corresponding transaction type
 */
function mapProductToTransactionType(product) {
  const productMap = {
    // Buy transactions
    'Forex Card': 'CARD',
    'Cash': 'CASH', 
    'Traveler Cheque': 'CASH',
    'Wire Transfer': 'TT',
    
    // Sell transactions  
    'Sell Cash': 'SELLCASH',
    'Sell Card': 'SELLCARD'
  };
  
  return productMap[product] || 'CASH'; // Default to CASH if product not found
}

/**
 * Validate stock availability from MarkupFee (Single Source of Truth)
 * @route POST /api/stock/validate
 * @access Private
 */
exports.validateStock = async (req, res) => {
  console.log("Stock Validation Request Body:", req.body);
  try {
    const { currencyCode, cityCode, amount, product } = req.body;
    console.log("Validation Parameters:", { currencyCode, cityCode, amount, product });
    
    // Validate required parameters
    if (!currencyCode || !cityCode || !amount || !product) {
      return errorResponse(res, 'currencyCode, cityCode, amount, and product are required', 400);
    }

    // Map product to transaction type for correct stock lookup
    const transactionType = mapProductToTransactionType(product);
    
    // Find the markup fee record that contains the stock quantity
    const markupFee = await MarkupFee.findOne({
      where: {
        currency_code: currencyCode.toUpperCase(),
        city_code: cityCode.toUpperCase(),
        transaction_type: transactionType,
        isActive: true
      }
    });

    if (!markupFee) {
      return errorResponse(res, `Stock configuration not found for ${currencyCode} in ${cityCode} for product: ${product}`, 404);
    }

    // Check if sufficient stock is available
    const availableQuantity = parseFloat(markupFee.quantity);
    const requestedAmount = parseFloat(amount);
    const isAvailable = availableQuantity >= requestedAmount;
    
    // Prepare response data
    const responseData = {
      currencyCode: markupFee.currency_code,
      cityCode: markupFee.city_code,
      product: product,
      transactionType: transactionType,
      requestedAmount: requestedAmount,
      availableAmount: availableQuantity,
      isAvailable: isAvailable,
      sufficient: isAvailable,
      // Additional helpful information
      currencyDescription: markupFee.curr_des,
      markupType: markupFee.markup_type,
      gstPercentage: parseFloat(markupFee.gst_percentage)
    };

    return successResponse(res, responseData, 'Stock validation completed', 200);

  } catch (error) {
    console.error('Stock validation error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get stock levels from MarkupFee with pagination and filtering
 * @route GET /api/stock/levels
 * @access Private/Admin
 */
exports.getStockLevels = async (req, res) => {
  try {
    const { currencyCode, cityCode, transaction_type } = req.query;
    const { page, limit, offset } = getPaginationParams(req);
    
    // Build where clause for filtering
    let whereClause = { isActive: true };
    
    // Add optional filters
    if (currencyCode) {
      whereClause.currency_code = currencyCode.toUpperCase();
    }
    
    if (cityCode) {
      whereClause.city_code = cityCode.toUpperCase();
    }

    if (transaction_type) {
      whereClause.transaction_type = transaction_type;
    }
    
    // Execute query with pagination
    const { count, rows } = await MarkupFee.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 
        'currency_code', 
        'curr_des',
        'city_code', 
        'transaction_type', 
        'quantity', 
        'markup_type',
        'gst_percentage',
        'isActive'
      ],
      order: [
        ['city_code', 'ASC'], 
        ['currency_code', 'ASC'], 
        ['transaction_type', 'ASC']
      ],
      limit: limit,
      offset: offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);
    
    return successResponse(res, rows, 'Stock levels fetched successfully', 200, metadata);
  } catch (error) {
    console.error('Get stock levels error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update stock levels in MarkupFee (Single Source of Truth for Inventory)
 * @route PUT /api/stock/:id
 * @access Private/Admin
 */
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body; 
    
    // operation can be: 'add', 'subtract', or 'set' (default)
    
    // Find the markup fee record to update
    const markupFee = await MarkupFee.findByPk(id);
    
    if (!markupFee) {
      return errorResponse(res, 'Markup fee not found', 404);
    }
    
    let newQuantity;
    const currentQuantity = parseFloat(markupFee.quantity);
    const quantityChange = parseFloat(quantity);
    
    // Perform the requested operation
    switch (operation) {
      case 'add':
        // Add to current quantity
        newQuantity = currentQuantity + quantityChange;
        break;
      case 'subtract':
        // Subtract from current quantity (with floor at 0)
        newQuantity = currentQuantity - quantityChange;
        if (newQuantity < 0) {
          return errorResponse(res, 'Cannot subtract more than available quantity', 400);
        }
        break;
      case 'set':
      default:
        // Set to exact quantity
        newQuantity = quantityChange;
        if (newQuantity < 0) {
          return errorResponse(res, 'Stock quantity cannot be negative', 400);
        }
        break;
    }
    
    // Update the stock quantity with 4 decimal precision
    await markupFee.update({ quantity: newQuantity.toFixed(4) });
    
    // Prepare response data
    const responseData = {
      id: markupFee.id,
      currency_code: markupFee.currency_code,
      curr_des: markupFee.curr_des,
      city_code: markupFee.city_code,
      transaction_type: markupFee.transaction_type,
      previousQuantity: currentQuantity,
      newQuantity: newQuantity,
      quantityChange: operation === 'set' ? null : Math.abs(quantityChange),
      operation: operation,
      updatedAt: markupFee.updatedAt
    };

    return successResponse(res, responseData, 'Stock updated successfully', 200);
  } catch (error) {
    console.error('Update stock error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get low stock alerts (optional enhancement)
 * @route GET /api/stock/alerts
 * @access Private/Admin
 */
exports.getStockAlerts = async (req, res) => {
  try {
    const { threshold = 1000 } = req.query; // Default threshold: 1000 units
    const { page, limit, offset } = getPaginationParams(req);
    
    // Find stocks below threshold
    const { count, rows } = await MarkupFee.findAndCountAll({
      where: {
        isActive: true,
        quantity: {
          [Op.lt]: parseFloat(threshold) // Less than threshold
        }
      },
      attributes: [
        'id', 
        'currency_code', 
        'curr_des',
        'city_code', 
        'transaction_type', 
        'quantity',
        'markup_type'
      ],
      order: [
        ['quantity', 'ASC'], // Show lowest stocks first
        ['city_code', 'ASC'],
        ['currency_code', 'ASC']
      ],
      limit: limit,
      offset: offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);
    metadata.threshold = parseFloat(threshold);
    
    return successResponse(res, rows, 'Low stock alerts fetched successfully', 200, metadata);
  } catch (error) {
    console.error('Get stock alerts error:', error);
    return errorResponse(res, error.message, 500);
  }
};