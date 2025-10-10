// migrations/add-security-fields-to-users.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    
    
    await queryInterface.addColumn('users', 'passwordLockedUntil', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'otpAttempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    
    await queryInterface.addColumn('users', 'otpLockedUntil', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'passwordLockedUntil');
    await queryInterface.removeColumn('users', 'otpAttempts');
    await queryInterface.removeColumn('users', 'otpLockedUntil');
  }
};