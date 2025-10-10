/* This code snippet is setting up a Sequelize database connection in a Node.js application. Here's a
breakdown of what it does: */
'use strict';

/* The code snippet you provided is setting up a Sequelize database connection in a Node.js
application. Here's a breakdown of what each line is doing: */
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

/* This part of the code snippet is reading the contents of the current directory synchronously using
`fs.readdirSync(__dirname)`. It then filters the files based on certain conditions using the
`filter` method: */
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

/* This part of the code snippet is iterating over the keys of the `db` object using `Object.keys(db)`.
For each key (which represents a model in the database), it checks if the associated model has an
`associate` method defined. If the `associate` method exists for the model, it calls
`db[modelName].associate(db)`, passing the `db` object as an argument. */
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
