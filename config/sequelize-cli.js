const config = require("./env");

// sequelize-cli reads per-environment settings; all environments use the validated env
const cliConfig = {
  username: config.db.user,
  password: config.db.password,
  database: config.db.name,
  host: config.db.host,
  port: config.db.port,
  dialect: "mysql",
  timezone: "+00:00",
  migrationStorageTableName: "sequelize_meta",
  seederStorage: "sequelize",
  seederStorageTableName: "sequelize_data",
};

module.exports = { development: cliConfig, test: cliConfig, production: cliConfig };
