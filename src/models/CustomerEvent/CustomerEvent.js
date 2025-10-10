// src/models/customerEvent/CustomerEvent.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const CustomerEvent = sequelize.define('CustomerEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Reference to customer session'
  },
  eventType: {
    type: DataTypes.ENUM(
      'page_view',
      'form_start',
      'form_progress',
      'form_abandoned',
      'form_completed',
      'button_click',
      'link_click',
      'calculation',
      'document_upload',
      'session_start',
      'session_end',
      'order_created',
      'order_abandoned',
      'error_occurred'
    ),
    allowNull: false,
    comment: 'Type of customer interaction event'
  },
  eventName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Descriptive event name'
  },
  pageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL where event occurred'
  },
  elementId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'HTML element ID if applicable'
  },
  formData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Form data at the time of event'
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Form completion percentage (0-100)'
  },
  forexRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'forex_requests',
      key: 'id'
    },
    comment: 'Reference to forex request if applicable'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional event metadata'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Event occurrence timestamp'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Event duration in milliseconds'
  }
}, {
  tableName: 'customer_events',
  indexes: [
    { fields: ['sessionId'] },
    { fields: ['eventType'] },
    { fields: ['timestamp'] },
    { fields: ['forexRequestId'] }
  ],
  comment: 'Tracks all customer interactions and events during session'
});

module.exports = CustomerEvent;