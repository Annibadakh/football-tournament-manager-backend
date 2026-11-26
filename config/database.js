const { Sequelize } = require("sequelize");
const config = require("./env");
const logger = require("./logger");

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: "mysql",
  timezone: "+00:00",
  logging: config.db.logging ? (sql) => logger.debug(sql) : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, idle: 10000 },
});

module.exports = sequelize;
