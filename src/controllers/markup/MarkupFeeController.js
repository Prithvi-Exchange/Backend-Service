const { Op } = require('sequelize');
const { MarkupFee } = require('../../models/markup/MarkupFee');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');
const { getPaginationParams, createPaginationMetadata } = require('../../middleware/response/pagination');

/**
 * Middleware to ensure city_code is provided in query parameters
 * Required for all markup fee operations that are city-specific
 */
function ensureCityCode(req, res, next) {
  if (!req.query.city_code) {
    return errorResponse(res, 'city_code is required', 400, null, 'CITY_CODE_REQUIRED');
  }
  next();
}

/**
 * Create a new Markup Fee configuration
 * @route POST /api/markup-fees
 * @access Private/Admin
 */
async function createMarkupFee(req, res) {
  try {
    const { 
      currency_code, 
      curr_des, 
      order, 
      image, 
      city_code, 
      transaction_type, 
      markup_type, 
      markup_value, 
      markup_value_sell, 
      gst_percentage, 
      isActive, 
      quantity 
    } = req.body;

    // Validate required fields
    if (!currency_code || !curr_des || !city_code || !transaction_type || !markup_type || !markup_value) {
      return errorResponse(res, 'Missing required fields', 400, null, 'MISSING_FIELDS');
    }

    // Normalize currency_code to uppercase
    const normalizedCurrencyCode = currency_code.toUpperCase();

    /**
     * Check for duplicate markup fee configuration
     * Unique constraint: currency_code + city_code + transaction_type + markup_type
     */
    const existing = await MarkupFee.findOne({
      where: { 
        currency_code: normalizedCurrencyCode, 
        city_code, 
        transaction_type, 
        markup_type 
      }
    });

    if (existing) {
      return errorResponse(res, 'Markup fee already exists for the same currency, city, transaction type, and markup type.', 409, null, 'DUPLICATE_MARKUP_FEE');
    }

    /**
     * Check if order already exists in the same city_code
     * Order must be unique within the same city for proper display ordering
     */
    if (order !== undefined) {
      const existingOrder = await MarkupFee.findOne({
        where: { city_code, order }
      });

      if (existingOrder) {
        return errorResponse(res, `Order ${order} already exists in city ${city_code}.`, 409, null, 'DUPLICATE_ORDER');
      }
    }

    // Convert numeric values to proper decimal format with precision
    const markupValueDecimal = parseFloat(markup_value).toFixed(4);
    const markupValueSellDecimal = markup_value_sell ? parseFloat(markup_value_sell).toFixed(4) : null;
    const gstPercentageDecimal = gst_percentage ? parseFloat(gst_percentage).toFixed(2) : '18.00';
    const quantityDecimal = quantity ? parseFloat(quantity).toFixed(4) : '0.0000';

    // Create new markup fee record
    const markupFee = await MarkupFee.create({
      currency_code: normalizedCurrencyCode,
      curr_des,
      order: order || 0, // Default order to 0 if not provided
      image,
      city_code,
      transaction_type,
      markup_type,
      markup_value: markupValueDecimal,
      markup_value_sell: markupValueSellDecimal,
      gst_percentage: gstPercentageDecimal,
      quantity: quantityDecimal, // Single source of truth for stock quantity
      isActive: isActive !== undefined ? Boolean(isActive) : true // Default to active
    });

    return successResponse(res, markupFee, 'Markup fee created successfully', 201);

  } catch (error) {
    console.error("Create markup fee error:", error);
    return errorResponse(res, error.message, 500, null, 'CREATE_ERROR');
  }
}

/**
 * Bulk create multiple Markup Fees in a single operation
 * @route POST /api/markup-fees/bulk
 * @access Private/Admin
 */
async function bulkCreateMarkupFees(req, res) {
  try {
    const { fees } = req.body;

    // Validate input format
    if (!Array.isArray(fees) || fees.length === 0) {
      return errorResponse(res, "fees must be a non-empty array", 400, null, 'INVALID_FEES_ARRAY');
    }

    // Normalize and validate each fee item
    const normalizedFees = fees.map(fee => ({
      ...fee,
      currency_code: fee.currency_code.toUpperCase(), // Normalize currency code
      markup_value: parseFloat(fee.markup_value).toFixed(4), // 4 decimal precision
      markup_value_sell: fee.markup_value_sell ? parseFloat(fee.markup_value_sell).toFixed(4) : null,
      gst_percentage: fee.gst_percentage ? parseFloat(fee.gst_percentage).toFixed(2) : '18.00', // Default GST 18%
      quantity: fee.quantity ? parseFloat(fee.quantity).toFixed(4) : '0.0000', // Stock quantity with 4 decimal precision
      isActive: fee.isActive !== undefined ? Boolean(fee.isActive) : true,
    }));

    // Validate each fee for duplicates before bulk creation
    for (let f of normalizedFees) {
      // Check for duplicate order in same city
      if (f.order !== undefined) {
        const existingOrder = await MarkupFee.findOne({
          where: { city_code: f.city_code, order: f.order }
        });
        if (existingOrder) {
          return errorResponse(res, `Order ${f.order} already exists in city ${f.city_code}.`, 409, null, 'DUPLICATE_ORDER');
        }
      }

      // Check for duplicate markup fee configuration
      const existing = await MarkupFee.findOne({
        where: {
          currency_code: f.currency_code,
          city_code: f.city_code,
          transaction_type: f.transaction_type,
          markup_type: f.markup_type
        }
      });
      if (existing) {
        return errorResponse(res, `Markup fee already exists for ${f.currency_code} in city ${f.city_code} (transaction: ${f.transaction_type}, type: ${f.markup_type}).`, 409, null, 'DUPLICATE_MARKUP_FEE');
      }
    }

    // Perform bulk creation
    const createdFees = await MarkupFee.bulkCreate(normalizedFees, { returning: true });

    const responseData = {
      fees: createdFees,
      count: createdFees.length
    };

    return successResponse(res, responseData, 'Markup fees created successfully', 201);

  } catch (error) {
    console.error("Bulk create markup fees error:", error);
    return errorResponse(res, error.message, 500, null, 'BULK_CREATE_ERROR');
  }
}

/**
 * Get list of markup fees with filtering and pagination
 * @route GET /api/markup-fees
 * @access Public (with city_code required)
 */
async function getMarkupFees(req, res) {
  try {
    const { currency_code, transaction_type, markup_type, gst_percentage, isActive } = req.query;
    const { city_code } = req.query;
    const { page, limit, offset } = getPaginationParams(req);

    // Build filter object
    const filters = { city_code }; // city_code is always required

    // Add optional filters if provided
    if (currency_code) filters.currency_code = currency_code.toUpperCase();
    if (transaction_type) filters.transaction_type = transaction_type;
    if (markup_type) filters.markup_type = markup_type;
    if (gst_percentage) filters.gst_percentage = gst_percentage;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    // Execute query with pagination
    const { count, rows } = await MarkupFee.findAndCountAll({ 
      where: filters,
      order: [['order', 'ASC'], ['currency_code', 'ASC']], // Order by display order then currency
      limit: limit,
      offset: offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);
    
    return successResponse(res, rows, 'Markup fees fetched successfully', 200, metadata);

  } catch (error) {
    console.error("Get markup fees error:", error);
    return errorResponse(res, error.message, 500, null, 'FETCH_ERROR');
  }
}

/**
 * Update an existing markup fee
 * @route PUT /api/markup-fees/:id
 * @access Private/Admin
 */
async function updateMarkupFee(req, res) {
  try {
    const { id } = req.params;
    const { 
      currency_code, 
      curr_des, 
      order, 
      image, 
      city_code, 
      transaction_type, 
      markup_type, 
      markup_value, 
      markup_value_sell, 
      gst_percentage, 
      isActive, 
      quantity 
    } = req.body;

    // Find existing markup fee
    const markupFee = await MarkupFee.findByPk(id);
    if (!markupFee) {
      return errorResponse(res, 'MarkupFee not found', 404, null, 'MARKUP_FEE_NOT_FOUND');
    }

    /**
     * Check for duplicate order in same city (excluding current record)
     * This prevents order conflicts when updating
     */
    if (order !== undefined && (city_code || markupFee.city_code)) {
      const targetCityCode = city_code || markupFee.city_code;
      const existingOrder = await MarkupFee.findOne({
        where: {
          city_code: targetCityCode,
          order,
          id: { [Op.ne]: id } // exclude current record from duplicate check
        }
      });

      if (existingOrder) {
        return errorResponse(res, `Order ${order} already exists in city ${targetCityCode}.`, 409, null, 'DUPLICATE_ORDER');
      }
    }

    // Prepare update data with proper decimal formatting
    const updateData = {};
    
    // Update fields only if provided in request
    if (currency_code) updateData.currency_code = currency_code.toUpperCase();
    if (curr_des !== undefined) updateData.curr_des = curr_des;
    if (order !== undefined) updateData.order = order;
    if (image !== undefined) updateData.image = image;
    if (city_code !== undefined) updateData.city_code = city_code;
    if (transaction_type !== undefined) updateData.transaction_type = transaction_type;
    if (markup_type !== undefined) updateData.markup_type = markup_type;
    
    // Format numeric values with proper precision
    if (markup_value !== undefined) {
      updateData.markup_value = parseFloat(markup_value).toFixed(4);
    }
    
    if (markup_value_sell !== undefined) {
      updateData.markup_value_sell = markup_value_sell ? parseFloat(markup_value_sell).toFixed(4) : null;
    }
    
    if (gst_percentage !== undefined) {
      updateData.gst_percentage = parseFloat(gst_percentage).toFixed(2);
    }

    // Update stock quantity - single source of truth for inventory
    if (quantity !== undefined) {
      updateData.quantity = parseFloat(quantity).toFixed(4);
    }
    
    if (isActive !== undefined) updateData.isActive = isActive;

    // Perform update
    await markupFee.update(updateData);

    // Fetch the updated record to ensure proper formatting in response
    const updatedMarkupFee = await MarkupFee.findByPk(id);

    return successResponse(res, updatedMarkupFee, 'Markup fee updated successfully', 200);

  } catch (error) {
    console.error("Update markup fee error:", error);
    return errorResponse(res, error.message, 500, null, 'UPDATE_ERROR');
  }
}

/**
 * Delete a markup fee
 * @route DELETE /api/markup-fees/:id
 * @access Private/Admin
 */
async function deleteMarkupFee(req, res) {
  try {
    const { id } = req.params;

    const markupFee = await MarkupFee.findByPk(id);
    if (!markupFee) {
      return errorResponse(res, 'MarkupFee not found', 404, null, 'MARKUP_FEE_NOT_FOUND');
    }

    await markupFee.destroy();
    
    return successResponse(res, null, 'Markup fee deleted successfully', 200);

  } catch (error) {
    console.error("Delete markup fee error:", error);
    return errorResponse(res, error.message, 500, null, 'DELETE_ERROR');
  }
}

module.exports = { 
  createMarkupFee, 
  bulkCreateMarkupFees, 
  getMarkupFees, 
  updateMarkupFee, 
  deleteMarkupFee, 
  ensureCityCode 
};