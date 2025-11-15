const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

const MODE = process.env.NODE_ENV;
console.log(`🚀 Running in MODE: ${MODE}`);

if (MODE === "production") {
  console.log("🔗 Using Render INTERNAL PostgreSQL");

  sequelize = new Sequelize(process.env.DATABASE_URL_RENDER, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });

} else {
  console.log("🔗 Using Render EXTERNAL PostgreSQL (Local Development)");

  sequelize = new Sequelize(process.env.DATABASE_URL_LOCAL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // important for Render PostgreSQL
      }
    }
  });
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
