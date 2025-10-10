// src/models/customerSession/CustomerSession.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const CustomerSession = sequelize.define('CustomerSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Unique session identifier for customer journey tracking'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID if customer is logged in'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Customer IP address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser/user agent information'
  },
  referrer: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'HTTP referrer'
  },
  landingPage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'First page visited'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'abandoned', 'expired'),
    defaultValue: 'active',
    comment: 'Session status'
  },
  orderCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether session resulted in a completed order'
  },
  forexRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'forex_requests',
      key: 'id'
    },
    comment: 'Reference to completed forex request'
  },
  sessionData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional session data'
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Session start timestamp'
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Session end timestamp'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Session duration in seconds'
  },
  pageViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total page views in session'
  },
  eventsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total events tracked in session'
  }
}, {
  tableName: 'customer_sessions',
  indexes: [
    { fields: ['sessionId'] },
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['startedAt'] },
    { fields: ['orderCompleted'] }
  ],
  comment: 'Tracks customer sessions and journey from landing to order completion'
});

module.exports = CustomerSession;