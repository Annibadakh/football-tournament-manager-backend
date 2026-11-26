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
  dialectOptions: { charset: "utf8mb4" },
  define: { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" },
  migrationStorageTableName: "sequelize_meta",
  seederStorage: "sequelize",
  seederStorageTableName: "sequelize_data",
};

module.exports = { development: cliConfig, test: cliConfig, production: cliConfig };
