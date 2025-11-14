const { sequelize } = require('../config/database');
const { City } = require('../models/city/City');

const cities = [
  { code: 'DEL', name: 'Delhi' },
  { code: 'MUM', name: 'Mumbai' },
  { code: 'BLR', name: 'Bengaluru' },
  { code: 'CHE', name: 'Chennai' },
  { code: 'KOL', name: 'Kolkata' },
  { code: 'HYD', name: 'Hyderabad' },
  { code: 'AHM', name: 'Ahmedabad' },
  { code: 'PUN', name: 'Pune' }
];

const seedCities = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected, seeding cities...');

    for (const cityData of cities) {
      const [city, created] = await City.findOrCreate({
        where: { code: cityData.code },
        defaults: cityData
      });
      
      if (created) {
        console.log(`Created city: ${city.code} - ${city.name}`);
      } else {
        console.log(`City already exists: ${city.code} - ${city.name}`);
      }
    }

    console.log('Cities seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedCities();