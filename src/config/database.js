// src/config/database.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelizeOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {}
};

// If running in production, enable SSL for many managed Postgres providers
if (process.env.NODE_ENV === 'production') {
  sequelizeOptions.dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

// prefer DATABASE_URL if available, otherwise use individual vars
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeOptions)
  : new Sequelize(
      process.env.DB_NAME || '',
      process.env.DB_USER || '',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        ...sequelizeOptions
      }
    );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    return true;
  } catch (error) {
    // Log full error for debugging but DO NOT exit the process in serverless
    console.error('❌ Database connection failed:', error && error.message ? error.message : error);
    // Return false so callers can handle failed connection gracefully
    return false;
  }
};

module.exports = { sequelize, connectDB };
