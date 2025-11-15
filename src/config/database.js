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
  console.log("🔗 Using Local PostgreSQL");
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
    }
  );
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
