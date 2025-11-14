// src/models/associations/index.js
const CustomerSession = require('../CustomerSession/CustomerSession');
const CustomerEvent = require('../CustomerEvent/CustomerEvent');
const ForexRequest = require('../currencyRequest/ForexRequest');
const { User } = require('../user/User');
const RefreshToken = require('../auth/RefreshToken');

const setupAssociations = () => {
  CustomerSession.hasMany(CustomerEvent, {
    foreignKey: 'sessionId',
    sourceKey: 'sessionId',
    as: 'events',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CustomerEvent.belongsTo(CustomerSession, {
    foreignKey: 'sessionId',
    targetKey: 'sessionId',
    as: 'session',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CustomerSession.belongsTo(ForexRequest, {
    foreignKey: 'forexRequestId',
    as: 'forexRequest',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  ForexRequest.hasOne(CustomerSession, {
    foreignKey: 'forexRequestId',
    as: 'session',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  CustomerEvent.belongsTo(ForexRequest, {
    foreignKey: 'forexRequestId',
    as: 'forexRequest',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  ForexRequest.hasMany(CustomerEvent, {
    foreignKey: 'forexRequestId',
    as: 'events',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  User.hasMany(ForexRequest, {
    foreignKey: 'userId',
    as: 'forexRequests',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  ForexRequest.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  User.hasMany(CustomerSession, {
    foreignKey: 'userId',
    as: 'sessions',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  CustomerSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  // IMPORTANT: link refresh tokens to user (you already had this)
  User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE'
  });

  RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
};

module.exports = { setupAssociations };
