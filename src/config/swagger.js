const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Prithvi Exchange API',
    version: '1.0.0',
    description: `
# Prithvi Exchange - Complete Financial API Documentation

Welcome to the Prithvi Exchange API! This comprehensive documentation provides details about all available endpoints for our financial services platform.

## 📋 Overview
Prithvi Exchange provides secure and reliable financial services including forex trading, stock investments, and currency exchange operations.

## 🔐 Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header as:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## 🌐 Base URLs
- **Development**: http://localhost:2000
- **Production**: https://api.prithvifx.com

## 📞 Support
- **Website**: https://prithvifx.com
- **Email**: app.support@prithvifx.com
- **Response Time**: Within 24 hours

## 🛡️ Security
- All API requests must use HTTPS
- Rate limiting is applied to prevent abuse
- Input validation is enforced on all endpoints
    `,
    termsOfService: 'https://prithvifx.com/terms',
    contact: {
      name: 'Prithvi Exchange Support',
      email: 'app.support@prithvifx.com',
      url: 'https://prithvifx.com/contact'
    },
    license: {
      name: 'Proprietary',
      url: 'https://prithvifx.com/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:2000/api',
      description: 'Development Server'
    },
    {
      url: 'https://api.prithvifx.com/api',
      description: 'Production Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token in the format: Bearer <token>'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Human-readable error message'
              },
              type: {
                type: 'string',
                description: 'Error type/category',
                enum: ['VALIDATION_ERROR', 'AUTH_ERROR', 'NOT_FOUND', 'SERVER_ERROR']
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'When the error occurred'
              },
              details: {
                type: 'array',
                description: 'Detailed validation errors (if any)',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            type: 'object',
            description: 'Response data payload'
          }
        }
      },
      StockValidationRequest: {
      type: 'object',
      required: ['currencyCode', 'cityCode', 'amount', 'product'],
      properties: {
        currencyCode: {
          type: 'string',
          description: '3-letter ISO currency code',
          example: 'USD',
          minLength: 3,
          maxLength: 3
        },
        cityCode: {
          type: 'string',
          description: '3-letter city/branch code',
          example: 'DEL',
          minLength: 3,
          maxLength: 3
        },
        amount: {
          type: 'number',
          description: 'Requested transaction amount',
          example: 1000.50,
          minimum: 0.01
        },
        product: {
          type: 'string',
          enum: ['Forex Card', 'Cash', 'Traveler Cheque', 'Wire Transfer', 'Sell Cash', 'Sell Card'],
          description: 'Type of financial product'
        }
      }
    },
    
    StockUpdateRequest: {
      type: 'object',
      required: ['quantity'],
      properties: {
        quantity: {
          type: 'number',
          description: 'Quantity value for the operation',
          example: 1000.50,
          minimum: 0
        },
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'set'],
          description: 'Operation to perform on stock quantity',
          default: 'set'
        }
      }
    },
    
    StockValidationResponse: {
      type: 'object',
      properties: {
        currencyCode: { type: 'string', example: 'USD' },
        cityCode: { type: 'string', example: 'DEL' },
        product: { type: 'string', example: 'Forex Card' },
        transactionType: { type: 'string', example: 'CARD' },
        requestedAmount: { type: 'number', example: 1000.50 },
        availableAmount: { type: 'number', example: 5000.75 },
        isAvailable: { type: 'boolean', example: true },
        sufficient: { type: 'boolean', example: true },
        currencyDescription: { type: 'string', example: 'US DOLLAR' },
        markupType: { type: 'string', example: 'PERCENTAGE' },
        gstPercentage: { type: 'number', example: 18.0 }
      }
    },
    
    StockLevel: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 1 },
        currency_code: { type: 'string', example: 'USD' },
        curr_des: { type: 'string', example: 'US DOLLAR' },
        city_code: { type: 'string', example: 'DEL' },
        transaction_type: { type: 'string', example: 'CARD' },
        quantity: { type: 'number', example: 5000.7500 },
        markup_type: { type: 'string', example: 'PERCENTAGE' },
        gst_percentage: { type: 'number', example: 18.0 },
        isActive: { type: 'boolean', example: true }
      }
    },
    MarkupFee: {
      type: 'object',
      required: ['currency_code', 'curr_des', 'city_code', 'transaction_type', 'markup_type', 'markup_value'],
      properties: {
        currency_code: {
          type: 'string',
          description: '3-letter ISO currency code',
          example: 'USD',
          minLength: 3,
          maxLength: 3
        },
        curr_des: {
          type: 'string',
          description: 'Currency description',
          example: 'US DOLLAR',
          maxLength: 100
        },
        order: {
          type: 'integer',
          description: 'Display order (unique per city)',
          example: 1,
          minimum: 0,
          default: 0
        },
        image: {
          type: 'string',
          description: 'Currency image filename',
          example: 'usd-flag.png',
          nullable: true
        },
        city_code: {
          type: 'string',
          description: '3-letter city/branch code',
          example: 'DEL',
          minLength: 3,
          maxLength: 3
        },
        transaction_type: {
          type: 'string',
          description: 'Type of transaction',
          enum: ['CASH', 'CARD', 'TT', 'SELLCASH', 'SELLCARD'],
          example: 'CASH'
        },
        markup_type: {
          type: 'string',
          description: 'Markup calculation method',
          enum: ['PERCENTAGE', 'FIXED'],
          example: 'PERCENTAGE'
        },
        markup_value: {
          type: 'number',
          description: 'Markup value with 4 decimal precision',
          example: 2.5000,
          minimum: 0
        },
        markup_value_sell: {
          type: 'number',
          description: 'Sell markup value with 4 decimal precision',
          example: 1.7500,
          minimum: 0,
          nullable: true
        },
        gst_percentage: {
          type: 'number',
          description: 'GST percentage with 2 decimal precision',
          example: 18.00,
          minimum: 0,
          maximum: 100,
          default: 18.00
        },
        isActive: {
          type: 'boolean',
          description: 'Active status',
          example: true,
          default: true
        },
        quantity: {
          type: 'number',
          description: 'Stock quantity with 4 decimal precision',
          example: 10000.0000,
          minimum: 0,
          default: 0.0000
        }
      }
    },
    
    BulkMarkupFeesRequest: {
      type: 'object',
      required: ['fees'],
      properties: {
        fees: {
          type: 'array',
          description: 'Array of markup fee objects',
          minItems: 1,
          items: {
            $ref: '#/components/schemas/MarkupFee'
          }
        }
      }
    },
    ForexRequest: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 1 },
        orderType: { type: 'string', enum: ['Buy', 'Sell'], example: 'Buy' },
        orderDetails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              orderType: { type: 'string', enum: ['Buy', 'Sell'] },
              currency: { type: 'string', example: 'USD' },
              product: { type: 'string', example: 'Forex Card' },
              currencyAmount: { type: 'number', example: 1000.50 },
              amountInINR: { type: 'number', example: 83250.75 }
            }
          }
        },
        travelerName: { type: 'string', example: 'Rajesh Kumar' },
        phoneNumber: { type: 'string', example: '+919876543210' },
        email: { type: 'string', format: 'email', example: 'rajesh.kumar@example.com' },
        panNumber: { type: 'string', example: 'ABCDE1234F' },
        indianResident: { type: 'boolean', example: true },
        deliveryAddress: { type: 'string', example: '123 Main Street, Connaught Place' },
        pincode: { type: 'string', example: '110001' },
        city: { type: 'string', example: 'New Delhi' },
        state: { type: 'string', example: 'Delhi' },
        travelingCountries: { 
          type: 'array', 
          items: { type: 'string', example: 'United States' } 
        },
        startDate: { type: 'string', format: 'date', example: '2024-03-15' },
        endDate: { type: 'string', format: 'date', example: '2024-03-30' },
        purpose: { 
          type: 'string', 
          enum: [
            'Leisure/Holiday/Personal Visit',
            'Business Visit', 
            'Education',
            'Medical Treatment',
            'Emigration',
            'Employment'
          ],
          example: 'Leisure/Holiday/Personal Visit'
        },
        businessReason: { type: 'string', example: 'Client meeting' },
        businessName: { type: 'string', example: 'Tech Solutions Pvt Ltd' },
        businessType: { type: 'string', example: 'IT Services' },
        status: { 
          type: 'string', 
          enum: ['Pending', 'Approved', 'Rejected', 'Documents Requested'],
          example: 'Pending'
        },
        rejectionReason: { type: 'string', example: 'Incomplete documentation' },
        orderSummary: {
          type: 'object',
          properties: {
            orderCount: { type: 'integer', example: 1 },
            currencies: { type: 'array', items: { type: 'string' } },
            totalCurrencyAmount: { type: 'number', example: 1000.50 },
            totalAmountInINR: { type: 'number', example: 83250.75 }
          }
        },
        totalCurrencyAmount: { type: 'number', example: 1000.50 },
        totalAmountInINR: { type: 'number', example: 83250.75 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },
    
    ValidationError: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Validation failed' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'email' },
              message: { type: 'string', example: 'Valid email address is required' },
              value: { type: 'string', example: 'invalid-email' }
            }
          }
        },
        errorCode: { type: 'string', example: 'VALIDATION_ERROR' }
      }
    },
    OrderDetail: {
      type: 'object',
      required: ['orderType', 'currency', 'product', 'currencyAmount', 'amountInINR'],
      properties: {
        orderType: { type: 'string', enum: ['Buy', 'Sell'] },
        currency: { type: 'string', example: 'USD' },
        product: { 
          type: 'string', 
          enum: ['Forex Card', 'Cash', 'Traveler Cheque', 'Wire Transfer', 'Sell Cash', 'Sell Card'],
          example: 'Forex Card'
        },
        currencyAmount: { type: 'number', example: 1000.50 },
        amountInINR: { type: 'number', example: 83250.75 }
      }
    }
    },
    CurrencyRatesResponse: {
      type: 'object',
      properties: {
        bpc: {
          type: 'number',
          description: 'Buy Prepaid Card rate (with markup + GST)',
          example: 83.4567
        },
        btt: {
          type: 'number', 
          description: 'Buy Wire Transfer rate (with markup + GST)',
          example: 83.1234
        },
        bdd: {
          type: 'number',
          description: 'Buy Demand Draft rate (with markup + GST)', 
          example: 83.1234
        },
        bcn: {
          type: 'number',
          description: 'Buy Cash rate (with markup + GST)',
          example: 83.7890
        },
        ncn_combo: {
          type: 'number',
          description: 'Cash + Card Combo rate (with markup + GST)',
          example: 83.4567
        },
        scn: {
          type: 'number',
          description: 'Sell Cash rate (with sell markup + GST)',
          example: 82.1234
        },
        spc: {
          type: 'number',
          description: 'Sell Prepaid Card rate (with sell markup + GST)',
          example: 82.4567
        },
        live_rate: {
          type: 'number',
          description: 'Base live rate from FCSAPI (without markup)',
          example: 82.1234
        },
        currency_code: {
          type: 'string',
          example: 'USD'
        },
        city: {
          type: 'string', 
          example: 'DEL'
        },
        source: {
          type: 'string',
          enum: ['live', 'database'],
          description: 'Data source - live API or cached database'
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        }
      },
    },
    MarkupDetails: {
      type: 'object',
      properties: {
        markup_value: {
          type: 'number',
          description: 'Markup value for transactions',
          example: 1.5000
        },
        markup_value_sell: {
          type: 'number',
          description: 'Markup value for sell transactions',
          example: 0.7500,
          nullable: true
        },
        markup_type: {
          type: 'string',
          enum: ['percentage', 'paisa'],
          description: 'Type of markup calculation',
          example: 'percentage'
        },
        gst_percentage: {
          type: 'number',
          description: 'GST percentage applied',
          example: 18.00
        },
        quantity: {
          type: 'number',
          description: 'Available stock quantity',
          example: 5000.7500
        }
      }
    },
    
    CurrencyUpdateResult: {
      type: 'object',
      properties: {
        currency: {
          type: 'string',
          example: 'USD'
        },
        action: {
          type: 'string',
          enum: ['created', 'updated'],
          description: 'Database operation performed'
        },
        rates: {
          type: 'object',
          properties: {
            bpc: { type: 'number' },
            btt: { type: 'number' },
            bdd: { type: 'number' },
            bcn: { type: 'number' },
            ncn_combo: { type: 'number' },
            scn: { type: 'number' },
            spc: { type: 'number' }
          }
        },
        live_rate: {
          type: 'number',
          description: 'Live rate from API before markup',
          example: 82.1234
        }
      }
    },
    parameters: {
      AuthorizationHeader: {
        in: 'header',
        name: 'Authorization',
        required: true,
        schema: {
          type: 'string',
          example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        description: 'JWT token for authentication'
      },
      SessionIdHeader: {
        in: 'header',
        name: 'X-Session-Id',
        schema: {
          type: 'string'
        },
        description: 'Session identifier for tracking'
      },
      CityCodeRequiredParam: {
      in: 'query',
      name: 'city_code',
      description: 'REQUIRED: 3-letter city/branch code',
      required: true,
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        example: 'DEL'
      }
    },
    
    CurrencyPairsParam: {
      in: 'query',
      name: 'currency_pairs',
      description: 'Comma-separated currency pairs (BASE/QUOTE format)',
      schema: {
        type: 'string',
        example: 'USD/INR,EUR/INR,GBP/INR'
      }
    },
      CurrencyCodeParam: {
      in: 'query',
      name: 'currencyCode',
      description: '3-letter ISO currency code filter',
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        example: 'USD'
      }
    },
    
    CityCodeParam: {
      in: 'query',
      name: 'cityCode',
      description: '3-letter city/branch code filter',
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        example: 'DEL'
      }
    },
    
    StockIdParam: {
      in: 'path',
      name: 'id',
      description: 'Stock record ID',
      required: true,
      schema: {
        type: 'integer',
        example: 1
      }
    },
    CityCodeRequiredParam: {
      in: 'query',
      name: 'city_code',
      description: 'REQUIRED: 3-letter city/branch code',
      required: true,
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        example: 'DEL'
      }
    },
    
    MarkupFeeIdParam: {
      in: 'path',
      name: 'id',
      description: 'Markup fee record ID',
      required: true,
      schema: {
        type: 'integer',
        example: 1
      }
    },
    
    CurrencyCodeFilterParam: {
      in: 'query',
      name: 'currency_code',
      description: 'Filter by currency code',
      schema: {
        type: 'string',
        example: 'USD'
      }
    },
    
    TransactionTypeFilterParam: {
      in: 'query',
      name: 'transaction_type',
      description: 'Filter by transaction type',
      schema: {
        type: 'string',
        enum: ['CASH', 'CARD', 'TT', 'SELLCASH', 'SELLCARD'],
        example: 'CASH'
      }
    },
    ForexRequestIdParam: {
      in: 'path',
      name: 'id',
      description: 'Forex request ID',
      required: true,
      schema: {
        type: 'integer',
        example: 1
      }
    },
    
    StatusFilterParam: {
      in: 'query',
      name: 'status',
      description: 'Filter by request status',
      schema: {
        type: 'string',
        enum: ['Pending', 'Approved', 'Rejected', 'Documents Requested'],
        example: 'Pending'
      }
    },
    
    OrderTypeFilterParam: {
      in: 'query',
      name: 'orderType',
      description: 'Filter by order type',
      schema: {
        type: 'string',
        enum: ['Buy', 'Sell'],
        example: 'Buy'
      }
    }
    }
  },
  responses: {
    // ... your existing responses ...
    
    MarkupFeeConflict: {
      description: 'Markup fee configuration conflict',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              code: { type: 'integer', example: 409 },
              message: { type: 'string' },
              errorCode: { 
                type: 'string',
                enum: ['DUPLICATE_MARKUP_FEE', 'DUPLICATE_ORDER'],
                example: 'DUPLICATE_MARKUP_FEE'
              },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    DocumentValidationError: {
      description: 'Missing required documents for approval',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string' },
              errors: {
                type: 'object',
                properties: {
                  missingDocuments: { type: 'array', items: { type: 'string' } }
                }
              },
              errorCode: { type: 'string', example: 'MISSING_APPROVAL_DOCUMENTS' }
            }
          }
        }
      }
    },
    CurrencyRatesMetadata: {
      description: 'Currency rates response metadata',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              city: { type: 'string', example: 'DEL' },
              total_currencies: { type: 'integer', example: 4 },
              source: { type: 'string', example: 'FCSAPI' },
              has_markup: { type: 'boolean', example: true },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User registration, login, and account verification endpoints'
    },
    {
      name: 'Users',
      description: 'User profile management and operations'
    },
   
    {
      name: 'Stocks',
      description: 'Stock market trading and investment operations'
    },
    {
      name: 'Currency',
      description: 'Currency exchange rate and conversion operations'
    },
    {
      name: 'Documents',
      description: 'Document upload and management operations'
    },
    
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../models/**/*.js')
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;