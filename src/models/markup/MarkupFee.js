const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const MarkupFee = sequelize.define('MarkupFee', {
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
  curr_des: {
    type: DataTypes.STRING,
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  city_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'DEL'
  },
  transaction_type: {
    type: DataTypes.ENUM('CASH', 'CARD', 'TT','SELLCASH','SELLCARD'),
    allowNull: false,
    defaultValue: 'CASH'
  },
  markup_type: {
    type: DataTypes.ENUM('paisa', 'percentage'),
    allowNull: false,
    defaultValue: 'paisa'
  },
  markup_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0.0000,
    get() {
      const value = this.getDataValue('markup_value');
      return value === null ? null : parseFloat(value);
    }
  },
  markup_value_sell: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    get() {
      const value = this.getDataValue('markup_value_sell');
      return value === null ? null : parseFloat(value);
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 4), // Increased precision for larger quantities
    allowNull: true,
    defaultValue: 0.0000,
    get() {
      const value = this.getDataValue('quantity');
      return value === null ? null : parseFloat(value);
    }
  },
  gst_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 18.00,
    get() {
      const value = this.getDataValue('gst_percentage');
      return value === null ? null : parseFloat(value);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'markup_fees',
  timestamps: true
});

module.exports = { MarkupFee };
