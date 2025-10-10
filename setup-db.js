require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function setupDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connection established successfully');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('✅ All models were synchronized successfully');
    
    console.log('✅ Prithvi Exchange database setup completed!');
  } catch (error) {
    console.error('❌ Unable to setup database:', error);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();