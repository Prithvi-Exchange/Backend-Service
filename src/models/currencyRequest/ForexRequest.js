const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ForexRequest = sequelize.define('ForexRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Main order details (for backward compatibility)
  orderType: {
    type: DataTypes.ENUM('Buy', 'Sell'),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  product: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currencyAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true
  },
  amountInINR: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  
  // Multiple order details (new field)
  orderDetails: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidOrderDetails(value) {
        if (value && Array.isArray(value)) {
          value.forEach((order, index) => {
            if (!order.orderType) throw new Error(`Order detail ${index}: orderType is required`);
            if (!order.currency) throw new Error(`Order detail ${index}: currency is required`);
            if (!order.product) throw new Error(`Order detail ${index}: product is required`);
            if (!order.currencyAmount) throw new Error(`Order detail ${index}: currencyAmount is required`);
            if (!order.amountInINR) throw new Error(`Order detail ${index}: amountInINR is required`);
            
            if (order.currencyAmount <= 0) throw new Error(`Order detail ${index}: currencyAmount must be positive`);
            if (order.amountInINR <= 0) throw new Error(`Order detail ${index}: amountInINR must be positive`);
          });
        }
      }
    }
  },

  // Traveler information
  travelerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  panNumber: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  indianResident: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },

  // Travel information (for Buy orders)
  travelingCountries: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purpose: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Business information (for Business Visit)
  businessReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  businessType: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Document URLs
  panCardImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passportFrontImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passportBackImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  airTicket: {
    type: DataTypes.STRING,
    allowNull: true
  },
  visaImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  collegeLetter: {
    type: DataTypes.STRING,
    allowNull: true
  },
  medicalCertificate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emigrationCertificate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  employmentCertificate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cancelledCheque: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyAddressProof: {
    type: DataTypes.STRING,
    allowNull: true
  },
  signatoriesList: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Delivery information
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Status and tracking
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Documents Requested'),
    defaultValue: 'Pending'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stockDeducted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'forex_requests',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['city']
    },
    {
      fields: ['sessionId']
    }
  ]
});

// Instance methods
ForexRequest.prototype.getTotalCurrencyAmount = function() {
  if (this.orderDetails && this.orderDetails.length > 0) {
    return this.orderDetails.reduce((total, order) => total + parseFloat(order.currencyAmount || 0), 0);
  }
  return parseFloat(this.currencyAmount || 0);
};

ForexRequest.prototype.getTotalAmountInINR = function() {
  if (this.orderDetails && this.orderDetails.length > 0) {
    return this.orderDetails.reduce((total, order) => total + parseFloat(order.amountInINR || 0), 0);
  }
  return parseFloat(this.amountInINR || 0);
};

ForexRequest.prototype.getOrderSummary = function() {
  if (this.orderDetails && this.orderDetails.length > 0) {
    const summary = {};
    this.orderDetails.forEach(order => {
      const key = `${order.currency}_${order.product}`;
      if (!summary[key]) {
        summary[key] = {
          currency: order.currency,
          product: order.product,
          totalCurrencyAmount: 0,
          totalAmountInINR: 0,
          count: 0
        };
      }
      summary[key].totalCurrencyAmount += parseFloat(order.currencyAmount || 0);
      summary[key].totalAmountInINR += parseFloat(order.amountInINR || 0);
      summary[key].count += 1;
    });
    return Object.values(summary);
  }
  
  return [{
    currency: this.currency,
    product: this.product,
    totalCurrencyAmount: parseFloat(this.currencyAmount || 0),
    totalAmountInINR: parseFloat(this.amountInINR || 0),
    count: 1
  }];
};

module.exports = ForexRequest;