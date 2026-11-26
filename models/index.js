const fs = require("fs");
const path = require("path");
const sequelize = require("../config/database");

// Loads every <Name>.model.js, then lets each one declare its associations
const models = {};

fs.readdirSync(__dirname)
  .filter((file) => file.endsWith(".model.js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize);
    models[model.name] = model;
  });

Object.values(models).forEach((model) => model.associate?.(models));

module.exports = { sequelize, ...models };
