const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const City = sequelize.define('City', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(3),
    allowNull: false,
    unique: true,
    validate: {
      isUppercase: true,
      len: [3, 3]
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cities',
  timestamps: true
});

module.exports = { City };