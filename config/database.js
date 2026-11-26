const { Sequelize } = require("sequelize");
const config = require("./env");
const logger = require("./logger");

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: "mysql",
  timezone: "+00:00",
  logging: config.db.logging ? (sql) => logger.debug(sql) : false,
  // utf8mb4 stores Marathi/Devanagari text and emoji; 0900_ai_ci is the MySQL 8 default collation
  dialectOptions: { charset: "utf8mb4" },
  define: {
    underscored: true,
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_0900_ai_ci",
  },
  pool: { max: 10, min: 0, idle: 10000 },
});

module.exports = sequelize;
