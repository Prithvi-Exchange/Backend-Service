'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('forex_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sessionId: {
        type: Sequelize.STRING
      },
      orderType: {
        type: Sequelize.STRING(50)
      },
      currency: {
        type: Sequelize.STRING(10)
      },
      product: {
        type: Sequelize.STRING(50)
      },
      currencyAmount: {
        type: Sequelize.DECIMAL(15, 2)
      },
      amountInINR: {
        type: Sequelize.DECIMAL(15, 2)
      },
      orderDetails: {
        type: Sequelize.JSONB
      },
      travelerName: {
        type: Sequelize.STRING
      },
      phoneNumber: {
        type: Sequelize.STRING(20)
      },
      email: {
        type: Sequelize.STRING
      },
      panNumber: {
        type: Sequelize.STRING(20)
      },
      indianResident: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      travelingCountries: {
        type: Sequelize.JSONB
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      purpose: {
        type: Sequelize.TEXT
      },
      businessReason: {
        type: Sequelize.TEXT
      },
      businessName: {
        type: Sequelize.STRING
      },
      businessType: {
        type: Sequelize.STRING(100)
      },
      panCardImage: {
        type: Sequelize.TEXT
      },
      passportFrontImage: {
        type: Sequelize.TEXT
      },
      passportBackImage: {
        type: Sequelize.TEXT
      },
      airTicket: {
        type: Sequelize.TEXT
      },
      visaImage: {
        type: Sequelize.TEXT
      },
      collegeLetter: {
        type: Sequelize.TEXT
      },
      medicalCertificate: {
        type: Sequelize.TEXT
      },
      emigrationCertificate: {
        type: Sequelize.TEXT
      },
      employmentCertificate: {
        type: Sequelize.TEXT
      },
      cancelledCheque: {
        type: Sequelize.TEXT
      },
      companyAddressProof: {
        type: Sequelize.TEXT
      },
      signatoriesList: {
        type: Sequelize.TEXT
      },
      deliveryAddress: {
        type: Sequelize.TEXT
      },
      pincode: {
        type: Sequelize.STRING(10)
      },
      city: {
        type: Sequelize.STRING(100)
      },
      state: {
        type: Sequelize.STRING(100)
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'Pending'
      },
      rejectionReason: {
        type: Sequelize.TEXT
      },
      stockDeducted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('forex_requests', ['userId']);
    await queryInterface.addIndex('forex_requests', ['sessionId']);
    await queryInterface.addIndex('forex_requests', ['status']);
    await queryInterface.addIndex('forex_requests', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('forex_requests');
  }
};