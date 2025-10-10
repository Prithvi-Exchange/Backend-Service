const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { City } = require('../city/City');

/**
 * Currency Model
 * Stores live currency rates and calculated prices for different transaction types
 * REMOVED: quantity field to eliminate dual inventory system
 * Now uses MarkupFee.quantity as single source of truth for stock
 */
const Currency = sequelize.define('Currency', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  currency_code: {
    type: DataTypes.STRING(3),
    allowNull: false,
    validate: {
      isUppercase: true,
      len: [3, 3]
    }
  },
  // Buy rates for different transaction types
  bpc: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Buy Prepaid Card rate' 
  },
  btt: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Buy Wire Transfer rate' 
  },
  bdd: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Buy Demand Draft rate' 
  },
  bcn: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Buy Cash rate' 
  },
  ncn_combo: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Buy Cash + Card combo rate' 
  },
  // Sell rates for different transaction types
  scn: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Sell Cash rate' 
  },
  spc: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true,
    comment: 'Sell Card rate' 
  },
  // REMOVED: quantity field - Now using MarkupFee.quantity as single inventory source
  city: {
    type: DataTypes.STRING(3),
    allowNull: false,
    references: { model: City, key: 'code' },
    comment: 'City code for location-based pricing'
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true,
    comment: 'Soft delete flag' 
  }
}, {
  tableName: 'currencies',
  timestamps: true,
  indexes: [
    // Unique constraint for currency-city combination
    { 
      unique: true, 
      fields: ['currency_code', 'city'],
      name: 'unique_currency_city' 
    },
    // Index for efficient city-based queries
    { 
      fields: ['city'],
      name: 'idx_currency_city' 
    },
    // Index for active/inactive filtering
    { 
      fields: ['isActive'],
      name: 'idx_currency_active' 
    }
  ],
  comment: 'Stores currency rates and calculated prices by city'
});

// Define associations
Currency.belongsTo(City, { 
  foreignKey: 'city', 
  targetKey: 'code',
  as: 'cityInfo' 
});

City.hasMany(Currency, { 
  foreignKey: 'city', 
  sourceKey: 'code',
  as: 'currencies' 
});

module.exports = { Currency };