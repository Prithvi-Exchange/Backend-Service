const ForexRequest = require('../../models/currencyRequest/ForexRequest');
const { MarkupFee } = require('../../models/markup/MarkupFee');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');
const { getPaginationParams, createPaginationMetadata } = require('../../middleware/response/pagination');
const { documentRequirements } = require('../../middleware/currencyRequest/currencyRequestValidation');
const { trackEvent, completeSessionWithOrder, markSessionAsAbandoned } = require('../../middleware/customerSession/sessionTracker');
const { getSafeSessionId, trackEventSafely } = require('../../utils/sessionHelper');
const { Op } = require('sequelize');

/**
 * Maps forex product types to markup transaction types for stock management
 */
const mapProductToTransactionType = (product) => {
  const productMap = {
    'Forex Card': 'CARD',
    'Cash': 'CASH',
    'Traveler Cheque': 'CASH',
    'Wire Transfer': 'TT',
    'Sell Cash': 'SELLCASH',
    'Sell Card': 'SELLCARD'
  };
  return productMap[product] || 'CASH';
};

/**
 * Validates stock availability from MarkupFee for multiple orders
 */
const validateStockAvailabilityFromMarkup = async (orderDetails, city) => {
  const stockValidationResults = [];
  
  for (const order of orderDetails) {
    const { currency, currencyAmount, product } = order;
    const transactionType = mapProductToTransactionType(product);
    
    const markupFee = await MarkupFee.findOne({
      where: {
        currency_code: currency.toUpperCase(),
        city_code: city.toUpperCase(),
        transaction_type: transactionType,
        isActive: true
      }
    });

    if (!markupFee) {
      throw new Error(`Markup configuration not found for ${currency} in ${city} for transaction type: ${transactionType}`);
    }

    const availableQuantity = markupFee.quantity || 0;
    if (availableQuantity < parseFloat(currencyAmount)) {
      throw new Error(`Insufficient stock for ${currency} ${product}. Available: ${availableQuantity}, Requested: ${currencyAmount}`);
    }

    stockValidationResults.push({
      currency,
      product,
      transactionType,
      availableQuantity,
      requestedAmount: parseFloat(currencyAmount),
      isValid: availableQuantity >= parseFloat(currencyAmount)
    });
  }

  return stockValidationResults;
};

/**
 * Deducts stock from MarkupFee for multiple orders when request is approved
 */
const deductStockFromMarkup = async (orderDetails, city) => {
  const deductionResults = [];
  
  for (const order of orderDetails) {
    const { currency, currencyAmount, product , orderType } = order;
    const transactionType = mapProductToTransactionType(product);
    
    const markupFee = await MarkupFee.findOne({
      where: {
        currency_code: currency.toUpperCase(),
        city_code: city.toUpperCase(),
        transaction_type: transactionType,
        isActive: true
      }
    });

    if (!markupFee) {
      throw new Error(`Markup configuration not found for stock deduction for ${currency} in ${city}`);
    }

    const currentQuantity = markupFee.quantity || 0;
    const newQuantity = orderType === "Buy" ? currentQuantity - parseFloat(currencyAmount) : currentQuantity + parseFloat(currencyAmount);


    if (newQuantity < 0) {
      throw new Error(`Insufficient stock for deduction for ${currency} ${product}`);
    }

    await markupFee.update({ quantity: newQuantity });

    deductionResults.push({
      currency,
      product,
      transactionType,
      previousQuantity: currentQuantity,
      newQuantity: newQuantity,
      amountDeducted: parseFloat(currencyAmount)
    });
  }

  return deductionResults;
};

/**
 * Creates a new Forex Request with multiple order details
 */
const createForexRequest = async (req, res) => {
  try {
    const { orderType, orderDetails } = req.body;
    const sessionId = getSafeSessionId(req);

    // Validate orderDetails structure
    if (orderDetails && !Array.isArray(orderDetails)) {
      return errorResponse(
        res,
        'orderDetails must be an array',
        400,
        null,
        'INVALID_ORDER_DETAILS_FORMAT'
      );
    }

    // If orderDetails is provided, validate each order
    if (orderDetails && orderDetails.length > 0) {
      for (let i = 0; i < orderDetails.length; i++) {
        const order = orderDetails[i];
        if (!order.orderType) {
          return errorResponse(
            res,
            `Order detail ${i}: orderType is required`,
            400,
            null,
            'MISSING_ORDER_TYPE'
          );
        }
        if (!order.currency) {
          return errorResponse(
            res,
            `Order detail ${i}: currency is required`,
            400,
            null,
            'MISSING_CURRENCY'
          );
        }
        if (!order.product) {
          return errorResponse(
            res,
            `Order detail ${i}: product is required`,
            400,
            null,
            'MISSING_PRODUCT'
          );
        }
        if (!order.currencyAmount) {
          return errorResponse(
            res,
            `Order detail ${i}: currencyAmount is required`,
            400,
            null,
            'MISSING_CURRENCY_AMOUNT'
          );
        }
        if (!order.amountInINR) {
          return errorResponse(
            res,
            `Order detail ${i}: amountInINR is required`,
            400,
            null,
            'MISSING_AMOUNT_INR'
          );
        }
      }
    }

    // === SELL ORDER VALIDATION ===
    if (orderType === 'Sell') {
      const requiredFields = [
        'travelerName', 'phoneNumber', 'email', 'panNumber',
        'indianResident', 'panCardImage', 'passportFrontImage',
        'passportBackImage', 'deliveryAddress', 'pincode', 'city', 'state'
      ];

      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        await trackEventSafely(req, {
          eventType: 'error_occurred',
          eventName: 'Sell Form Validation Failed - Missing Fields',
          metadata: { missingFields }
        });

        return errorResponse(
          res,
          `Missing required fields for Sell order: ${missingFields.join(', ')}`,
          400,
          null,
          'MISSING_REQUIRED_FIELDS_SELL'
        );
      }

      // Validate allowed products in orderDetails
      if (orderDetails && orderDetails.length > 0) {
        for (const order of orderDetails) {
          if (!['Sell Cash', 'Sell Card'].includes(order.product)) {
            return errorResponse(
              res,
              `Invalid product for Sell order: ${order.product}. Allowed values: Sell Cash, Sell Card`,
              400,
              null,
              'INVALID_SELL_PRODUCT'
            );
          }
        }
      }

      await trackEventSafely(req, {
        eventType: 'form_progress',
        eventName: 'Sell Order Form Submission Started',
        progress: 75,
        formData: req.body
      });

      // Validate stock for all order details
      if (orderDetails && orderDetails.length > 0) {
        await validateStockAvailabilityFromMarkup(orderDetails, req.body.city);
      }

      const createData = {
        ...req.body,
        userId: req.user.id,
        sessionId,
        // Store multiple order details
        orderDetails: orderDetails || []
      };

      const forexRequest = await ForexRequest.create(createData);

      await trackEventSafely(req, {
        eventType: 'order_created',
        eventName: 'Sell Forex Request Created Successfully',
        forexRequestId: forexRequest.id,
        orderCount: orderDetails ? orderDetails.length : 0,
        formData: req.body
      });

      if (sessionId && !sessionId.startsWith('sess_fallback')) {
        await completeSessionWithOrder(sessionId, forexRequest.id);
      }

      return successResponse(res, forexRequest, 'Sell forex request created successfully', 201);
    }

    // === BUY / OTHER ORDER VALIDATION ===
    const { currency, currencyAmount, city, product, travelingCountries, startDate, endDate, purpose } = req.body;

    // For backward compatibility, check if using single order or multiple orders
    const hasOrderDetails = orderDetails && orderDetails.length > 0;
    
    const missingBuyFields = [];
    if (!hasOrderDetails) {
      // Single order validation (backward compatibility)
      if (!currency) missingBuyFields.push('currency');
      if (!currencyAmount) missingBuyFields.push('currencyAmount');
      if (!product) missingBuyFields.push('product');
    }
    
    // Common required fields for both single and multiple orders
    if (!city) missingBuyFields.push('city');
    if (!Array.isArray(travelingCountries) || travelingCountries.length === 0) missingBuyFields.push('travelingCountries');
    if (!startDate) missingBuyFields.push('startDate');
    if (!endDate) missingBuyFields.push('endDate');
    if (!purpose) missingBuyFields.push('purpose');

    if (missingBuyFields.length > 0) {
      await trackEventSafely(req, {
        eventType: 'error_occurred',
        eventName: 'Buy Form Validation Failed - Missing Fields',
        metadata: { missingBuyFields }
      });

      return errorResponse(
        res,
        `Missing required fields for Buy order: ${missingBuyFields.join(', ')}`,
        400,
        null,
        'MISSING_REQUIRED_FIELDS_BUY'
      );
    }

    await trackEventSafely(req, {
      eventType: 'form_progress',
      eventName: 'Form Submission Started',
      progress: 75,
      formData: { 
        orderType, 
        orderCount: hasOrderDetails ? orderDetails.length : 1,
        travelingCountriesCount: travelingCountries.length 
      }
    });

    // Validate stock for all order details
    if (hasOrderDetails) {
      await validateStockAvailabilityFromMarkup(orderDetails, city);
    } else {
      // For single order (backward compatibility)
      await validateStockAvailabilityFromMarkup([{ currency, currencyAmount, product }], city);
    }

    await trackEventSafely(req, {
      eventType: 'calculation',
      eventName: 'Stock Validation Passed',
      metadata: { 
        orderCount: hasOrderDetails ? orderDetails.length : 1,
        city 
      }
    });

    const createData = {
      ...req.body,
      userId: req.user.id,
      sessionId,
      // Store multiple order details or single order
      orderDetails: hasOrderDetails ? orderDetails : undefined
    };

    const forexRequest = await ForexRequest.create(createData);

    await trackEventSafely(req, {
      eventType: 'order_created',
      eventName: 'Forex Request Created Successfully',
      forexRequestId: forexRequest.id,
      formData: {
        orderType,
        purpose,
        orderCount: hasOrderDetails ? orderDetails.length : 1,
        totalAmountInINR: forexRequest.getTotalAmountInINR()
      }
    });

    if (sessionId && !sessionId.startsWith('sess_fallback')) {
      await completeSessionWithOrder(sessionId, forexRequest.id);
    }

    return successResponse(res, forexRequest, 'Forex request created successfully', 201);

  } catch (error) {
    console.error('Error creating forex request:', error);

    await trackEventSafely(req, {
      eventType: 'error_occurred',
      eventName: 'Forex Request Creation Failed',
      metadata: { error: error.message, fields: req.body }
    });

    return errorResponse(res, error.message, 500, null, 'CREATE_FOREX_REQUEST_ERROR');
  }
};

/**
 * Get user's forex requests with order details
 */
const getUserForexRequests = async (req, res) => {
  try {
    const { status, purpose } = req.query;
    const { page, limit, offset } = getPaginationParams(req);
    const whereClause = { userId: req.user.id };

    if (status) whereClause.status = status;
    if (purpose) whereClause.purpose = purpose;

    const { count, rows } = await ForexRequest.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Enhance response with order summary
    const enhancedRows = rows.map(request => ({
      ...request.toJSON(),
      orderSummary: request.getOrderSummary(),
      totalCurrencyAmount: request.getTotalCurrencyAmount(),
      totalAmountInINR: request.getTotalAmountInINR()
    }));

    const metadata = createPaginationMetadata(page, limit, count, rows);
    return successResponse(res, enhancedRows, 'Forex requests fetched successfully', 200, metadata);
  } catch (error) {
    console.error('Error fetching user forex requests:', error);
    return errorResponse(res, error.message, 500, null, 'FETCH_USER_REQUESTS_ERROR');
  }
};

/**
 * Get all forex requests (admin) with enhanced order details
 */
const getAllForexRequests = async (req, res) => {
  try {
    const { city, email, phoneNumber, travelerName, status, userId, purpose, orderType } = req.query;
    const { page, limit, offset } = getPaginationParams(req);
    const whereClause = {};

    if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
    if (email) whereClause.email = { [Op.iLike]: `%${email}%` };
    if (phoneNumber) whereClause.phoneNumber = { [Op.iLike]: `%${phoneNumber}%` };
    if (travelerName) whereClause.travelerName = { [Op.iLike]: `%${travelerName}%` };
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    if (purpose) whereClause.purpose = purpose;
    if (orderType) whereClause.orderType = orderType;

    const { count, rows } = await ForexRequest.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Enhance response with order summary
    const enhancedRows = rows.map(request => ({
      ...request.toJSON(),
      orderSummary: request.getOrderSummary(),
      totalCurrencyAmount: request.getTotalCurrencyAmount(),
      totalAmountInINR: request.getTotalAmountInINR()
    }));

    const metadata = createPaginationMetadata(page, limit, count, rows);
    return successResponse(res, enhancedRows, 'Forex requests fetched successfully', 200, metadata);
  } catch (error) {
    console.error('Error fetching forex requests:', error);
    return errorResponse(res, error.message, 500, null, 'FETCH_ALL_REQUESTS_ERROR');
  }
};

/**
 * Get forex request by ID with enhanced order details
 */
const getForexRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const forexRequest = await ForexRequest.findByPk(id);

    if (!forexRequest) {
      return errorResponse(res, 'Forex request not found', 404, null, 'FOREX_REQUEST_NOT_FOUND');
    }

    // Enhance response with order summary
    const enhancedRequest = {
      ...forexRequest.toJSON(),
      orderSummary: forexRequest.getOrderSummary(),
      totalCurrencyAmount: forexRequest.getTotalCurrencyAmount(),
      totalAmountInINR: forexRequest.getTotalAmountInINR()
    };

    return successResponse(res, enhancedRequest, 'Forex request fetched successfully', 200);
  } catch (error) {
    console.error('Error fetching forex request:', error);
    return errorResponse(res, error.message, 500, null, 'FETCH_REQUEST_ERROR');
  }
};

/**
 * Update forex request
 */
const updateForexRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await ForexRequest.update(req.body, { where: { id } });

    if (!updated) {
      return errorResponse(res, 'Forex request not found', 404, null, 'FOREX_REQUEST_NOT_FOUND');
    }

    const updatedRequest = await ForexRequest.findByPk(id);
    
    // Enhance response with order summary
    const enhancedRequest = {
      ...updatedRequest.toJSON(),
      orderSummary: updatedRequest.getOrderSummary(),
      totalCurrencyAmount: updatedRequest.getTotalCurrencyAmount(),
      totalAmountInINR: updatedRequest.getTotalAmountInINR()
    };

    return successResponse(res, enhancedRequest, 'Forex request updated successfully', 200);
  } catch (error) {
    console.error('Error updating forex request:', error);
    return errorResponse(res, error.message, 500, null, 'UPDATE_REQUEST_ERROR');
  }
};

/**
 * Delete forex request
 */
const deleteForexRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ForexRequest.destroy({ where: { id } });

    if (!deleted) {
      return errorResponse(res, 'Forex request not found', 404, null, 'FOREX_REQUEST_NOT_FOUND');
    }

    return successResponse(res, null, 'Forex request deleted successfully', 200);
  } catch (error) {
    console.error('Error deleting forex request:', error);
    return errorResponse(res, error.message, 500, null, 'DELETE_REQUEST_ERROR');
  }
};

/**
 * Update status with support for multiple order stock deduction
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Pending', 'Approved', 'Rejected', 'Documents Requested'].includes(status)) {
      return errorResponse(res, 'Status must be one of: Pending, Approved, Rejected, Documents Requested', 400, null, 'INVALID_STATUS');
    }

    const forexRequest = await ForexRequest.findByPk(id);

    if (!forexRequest) {
      return errorResponse(res, 'Forex request not found', 404, null, 'FOREX_REQUEST_NOT_FOUND');
    }

    if (status === 'Approved') {
      const requiredDocs = documentRequirements[forexRequest.purpose]?.required || [];
      const missingDocs = requiredDocs.filter(docField => !forexRequest[docField]);

      if (missingDocs.length > 0) {
        return errorResponse(res, `Cannot approve request. Missing required documents: ${missingDocs.join(', ')}`, 400, { missingDocuments: missingDocs }, 'MISSING_APPROVAL_DOCUMENTS');
      }

      if (forexRequest.purpose === 'Business Visit') {
        const businessFields = ['businessReason', 'businessName', 'businessType'];
        const missingBusinessFields = businessFields.filter(field => !forexRequest[field]);

        if (missingBusinessFields.length > 0) {
          return errorResponse(res, `Cannot approve business visit. Missing required fields: ${missingBusinessFields.join(', ')}`, 400, { missingBusinessFields }, 'MISSING_BUSINESS_FIELDS');
        }
      }

      try {
        let deductionResult = [];
        
        // Handle multiple order details or single order
        if (forexRequest.orderDetails && forexRequest.orderDetails.length > 0) {
          deductionResult = await deductStockFromMarkup(forexRequest.orderDetails, forexRequest.city);
        } else {
          // For single order (backward compatibility)
          deductionResult = await deductStockFromMarkup(
            [{
              currency: forexRequest.currency,
              currencyAmount: forexRequest.currencyAmount,
              product: forexRequest.product
            }], 
            forexRequest.city
          );
        }
        
        await ForexRequest.update({ status: 'Approved', stockDeducted: true }, { where: { id } });
        const updatedRequest = await ForexRequest.findByPk(id);
        
        // Enhance response with order summary
        const enhancedRequest = {
          ...updatedRequest.toJSON(),
          orderSummary: updatedRequest.getOrderSummary(),
          totalCurrencyAmount: updatedRequest.getTotalCurrencyAmount(),
          totalAmountInINR: updatedRequest.getTotalAmountInINR()
        };
        
        const responseData = { 
          request: enhancedRequest, 
          stockDeduction: deductionResult 
        };

        return successResponse(res, responseData, 'Request approved successfully and stock deducted', 200);
      } catch (deductionError) {
        return errorResponse(res, `Stock deduction failed: ${deductionError.message}`, 400, null, 'STOCK_DEDUCTION_ERROR');
      }
    }

    if (status === 'Rejected' && !rejectionReason) {
        return errorResponse(res, 'Rejection reason is required when rejecting a request', 400, null, 'MISSING_REJECTION_REASON');
    }

    const updateData = { status };
    if (status === 'Rejected' && rejectionReason) updateData.rejectionReason = rejectionReason;
    
    const [updated] = await ForexRequest.update(updateData, { where: { id } });

    if (!updated) {
      return errorResponse(res, 'Forex request not found', 404, null, 'FOREX_REQUEST_NOT_FOUND');
    }
    
    const updatedRequest = await ForexRequest.findByPk(id);
    
    // Enhance response with order summary
    const enhancedRequest = {
      ...updatedRequest.toJSON(),
      orderSummary: updatedRequest.getOrderSummary(),
      totalCurrencyAmount: updatedRequest.getTotalCurrencyAmount(),
      totalAmountInINR: updatedRequest.getTotalAmountInINR()
    };
    
    return successResponse(res, enhancedRequest, 'Status updated successfully', 200);

  } catch (error) {
    console.error('Error updating status:', error);
    return errorResponse(res, error.message, 500, null, 'UPDATE_STATUS_ERROR');
  }
};

/**
 * Track form abandonment
 */
const trackFormAbandonment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const formData = req.body.formData || {};

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required', 400);
    }

    await trackEvent(sessionId, {
      eventType: 'form_abandoned',
      eventName: 'Forex Form Abandoned',
      formData,
      progress: formData.progress || 0,
      metadata: {
        abandonmentReason: req.body.reason || 'user_navigation',
        timeSpent: req.body.timeSpent
      }
    });

    await markSessionAsAbandoned(sessionId, 'form_abandoned');

    return successResponse(res, null, 'Form abandonment tracked successfully', 200);
  } catch (error) {
    console.error('Error tracking form abandonment:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Track form progress
 */
const trackFormProgress = async (req, res) => {
  try {
    const { sessionId, step, progress, formData } = req.body;

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required', 400);
    }

    await trackEvent(sessionId, {
      eventType: 'form_progress',
      eventName: `Form Progress - ${step}`,
      progress,
      formData,
      metadata: { step, timestamp: new Date().toISOString() }
    });

    return successResponse(res, null, 'Form progress tracked successfully', 200);
  } catch (error) {
    console.error('Error tracking form progress:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createForexRequest,
  getUserForexRequests,
  getAllForexRequests,
  getForexRequestById,
  updateForexRequest,
  deleteForexRequest,
  updateStatus,
  validateStockAvailabilityFromMarkup,
  deductStockFromMarkup,
  mapProductToTransactionType,
  trackFormAbandonment,
  trackFormProgress
};