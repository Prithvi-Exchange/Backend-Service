'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('refresh_tokens', 'device_uuid', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('refresh_tokens', 'is_biometric_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('refresh_tokens', 'device_uuid');
    await queryInterface.removeColumn('refresh_tokens', 'is_biometric_enabled');
  }
};