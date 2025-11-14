const CustomerSession = require('../CustomerSession/CustomerSession');
const CustomerEvent = require('../CustomerEvent/CustomerEvent');
const ForexRequest = require('../currencyRequest/ForexRequest');
const { User } = require('../user/User'); // Ensure User model is exported properly
const RefreshToken = require('../auth/RefreshToken');

const setupAssociations = () => {
  /** ----------------------------------------
   *  CustomerSession ↔ CustomerEvent (One-to-Many)
   * ---------------------------------------- */
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

  /** ----------------------------------------
   *  CustomerSession ↔ ForexRequest (One-to-One)
   * ---------------------------------------- */
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

  /** ----------------------------------------
   *  CustomerEvent ↔ ForexRequest (Many-to-One)
   * ---------------------------------------- */
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

  /** ----------------------------------------
   *  User ↔ ForexRequest (One-to-Many)
   *  Set userId to NULL if User is deleted
   * ---------------------------------------- */
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

  /** ----------------------------------------
   *  User ↔ CustomerSession (One-to-Many)
   *  Set userId to NULL if User is deleted
   * ---------------------------------------- */
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

  /** ----------------------------------------
   *  User ↔ RefreshToken (One-to-Many) - FIXED
   * ---------------------------------------- */
  User.hasMany(RefreshToken, {
    foreignKey: 'userId', // Sequelize model field name
    as: 'refreshTokens',
    onDelete: 'CASCADE'
  });

  RefreshToken.belongsTo(User, {
    foreignKey: 'userId', // Sequelize model field name
    as: 'user',
    onDelete: 'CASCADE'
  });
};

module.exports = { setupAssociations };