const { body, validationResult } = require('express-validator');

/**
 * Document requirement configurations for each travel purpose
 */
const documentRequirements = {
  'Leisure/Holiday/Personal Visit': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage'],
    optional: []
  },
  'Business Visit': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage', 'cancelledCheque', 'companyAddressProof', 'signatoriesList'],
    businessFields: ['businessReason', 'businessName', 'businessType']
  },
  'Education': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage', 'collegeLetter'],
    optional: []
  },
  'Medical Treatment': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage', 'medicalCertificate'],
    optional: []
  },
  'Emigration': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage', 'emigrationCertificate'],
    optional: []
  },
  'Employment': {
    required: ['panCardImage', 'passportFrontImage', 'passportBackImage', 'airTicket', 'visaImage', 'employmentCertificate'],
    optional: []
  }
};

/**
 * Common validation rules applicable to all forex requests
 */
const commonValidationRules = [
  body('orderType')
    .isIn(['Buy', 'Sell'])
    .withMessage('Order type must be either Buy or Sell'),

  body('orderDetails')
    .optional()
    .isArray()
    .withMessage('orderDetails must be an array')
    .custom((orderDetails) => {
      if (orderDetails && orderDetails.length > 0) {
        orderDetails.forEach((order, index) => {
          if (!order.orderType) {
            throw new Error(`Order detail ${index}: orderType is required`);
          }
          if (!order.currency) {
            throw new Error(`Order detail ${index}: currency is required`);
          }
          if (!order.product) {
            throw new Error(`Order detail ${index}: product is required`);
          }
          if (!order.currencyAmount) {
            throw new Error(`Order detail ${index}: currencyAmount is required`);
          }
          if (!order.amountInINR) {
            throw new Error(`Order detail ${index}: amountInINR is required`);
          }
          
          if (order.currencyAmount <= 0) {
            throw new Error(`Order detail ${index}: currencyAmount must be positive`);
          }
          if (order.amountInINR <= 0) {
            throw new Error(`Order detail ${index}: amountInINR must be positive`);
          }
        });
      }
      return true;
    }),

  // For backward compatibility - single order fields
  body('currency')
    .if(body('orderDetails').not().exists())
    .trim()
    .notEmpty()
    .withMessage('Currency code is required when not using orderDetails')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be 3 characters'),

  body('product')
    .if(body('orderDetails').not().exists())
    .trim()
    .notEmpty()
    .withMessage('Product type is required when not using orderDetails'),

  body('currencyAmount')
    .if(body('orderDetails').not().exists())
    .isFloat({ min: 0.0001 })
    .withMessage('Currency amount must be a positive number greater than 0'),

  body('amountInINR')
    .if(body('orderDetails').not().exists())
    .isFloat({ min: 1 })
    .withMessage('INR amount must be a positive number greater than 1'),

  body('travelerName')
    .trim()
    .notEmpty()
    .withMessage('Traveler name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Traveler name must be between 2 and 100 characters'),

  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),

  body('panNumber')
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be exactly 10 characters')
    .matches(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)
    .withMessage('Invalid PAN number format'),

  body('indianResident')
    .isBoolean()
    .withMessage('Indian resident status must be true or false'),

  body('deliveryAddress')
    .trim()
    .notEmpty()
    .withMessage('Delivery address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),

  body('pincode')
    .isPostalCode('IN')
    .withMessage('Valid Indian pincode is required'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
];

/**
 * Conditional validation for Buy orders only
 */
const buyOrderValidationRules = [
  body('travelingCountries')
    .if(body('orderType').equals('Buy'))
    .isArray({ min: 1 })
    .withMessage('At least one traveling country is required'),

  body('travelingCountries.*')
    .if(body('orderType').equals('Buy'))
    .trim()
    .notEmpty()
    .withMessage('Country name cannot be empty'),

  body('startDate')
    .if(body('orderType').equals('Buy'))
    .isISO8601()
    .withMessage('Valid start date in ISO format is required'),

  body('endDate')
    .if(body('orderType').equals('Buy'))
    .isISO8601()
    .withMessage('Valid end date in ISO format is required'),

  body('purpose')
    .if(body('orderType').equals('Buy'))
    .isIn([
      'Leisure/Holiday/Personal Visit',
      'Business Visit',
      'Education',
      'Medical Treatment',
      'Emigration',
      'Employment'
    ])
    .withMessage('Valid purpose is required'),
];

/**
 * Business visit–specific fields (only if Buy + purpose = Business Visit)
 */
const businessValidationRules = [
  body('businessReason')
    .if(body('purpose').equals('Business Visit'))
    .trim()
    .notEmpty()
    .withMessage('Business reason is required for business visits'),

  body('businessName')
    .if(body('purpose').equals('Business Visit'))
    .trim()
    .notEmpty()
    .withMessage('Business name is required for business visits'),

  body('businessType')
    .if(body('purpose').equals('Business Visit'))
    .trim()
    .notEmpty()
    .withMessage('Business type is required for business visits'),
];

/**
 * Travel date logic checks (only for Buy)
 */
const travelDateValidation = [
  body('startDate').custom((startDate, { req }) => {
    if (req.body.orderType === 'Sell') return true; // Skip for Sell

    const endDate = req.body.endDate;
    const today = new Date();
    const travelStart = new Date(startDate);
    const travelEnd = new Date(endDate);

    if (travelStart >= travelEnd) {
      throw new Error('Travel start date must be before end date');
    }
    if (travelStart < today) {
      throw new Error('Travel start date cannot be in the past');
    }

    const daysDifference = Math.ceil((travelStart - today) / (1000 * 60 * 60 * 24));
    if (daysDifference > 60) {
      throw new Error('Travel must start within 60 days from today');
    }

    return true;
  })
];

/**
 * Document URL validation rules
 */
const documentUrlValidation = [
  body('panCardImage').optional().isURL().withMessage('PAN card image must be a valid URL'),
  body('passportFrontImage').optional().isURL().withMessage('Passport front image must be a valid URL'),
  body('passportBackImage').optional().isURL().withMessage('Passport back image must be a valid URL'),
  body('airTicket').optional().isURL().withMessage('Air ticket must be a valid URL'),
  body('visaImage').optional().isURL().withMessage('Visa image must be a valid URL'),
  body('collegeLetter').optional().isURL().withMessage('College letter must be a valid URL'),
  body('medicalCertificate').optional().isURL().withMessage('Medical certificate must be a valid URL'),
  body('emigrationCertificate').optional().isURL().withMessage('Emigration certificate must be a valid URL'),
  body('employmentCertificate').optional().isURL().withMessage('Employment certificate must be a valid URL'),
  body('cancelledCheque').optional().isURL().withMessage('Cancelled cheque must be a valid URL'),
  body('companyAddressProof').optional().isURL().withMessage('Company address proof must be a valid URL'),
  body('signatoriesList').optional().isURL().withMessage('Signatories list must be a valid URL'),
];

/**
 * Combine all validations
 */
const validateForexRequest = [
  ...commonValidationRules,
  ...buyOrderValidationRules,
  ...businessValidationRules,
  ...travelDateValidation,
  ...documentUrlValidation
];

/**
 * Required document validation for Buy purposes
 */
const validateRequiredDocuments = (req, res, next) => {
  const { orderType, purpose } = req.body;

  // Skip document requirement check for Sell
  if (orderType === 'Sell') return next();

  if (!documentRequirements[purpose]) return next();

  const requiredDocs = documentRequirements[purpose].required;
  const missingDocs = requiredDocs.filter(
    (doc) => !req.body[doc] || typeof req.body[doc] !== 'string' || req.body[doc].trim() === ''
  );

  if (missingDocs.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required documents for ${purpose}`,
      errors: missingDocs.map((doc) => ({
        field: doc,
        message: `${doc.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} is required for ${purpose}`
      })),
      errorCode: 'MISSING_REQUIRED_DOCUMENTS'
    });
  }

  next();
};

/**
 * Handles validation errors and returns structured response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value
      })),
      errorCode: 'VALIDATION_ERROR'
    });
  }
  next();
};

module.exports = {
  validateForexRequest,
  validateRequiredDocuments,
  handleValidationErrors,
  documentRequirements
};