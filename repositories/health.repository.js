const sequelize = require("../config/database");

const pingDatabase = () => sequelize.authenticate();

module.exports = { pingDatabase };
