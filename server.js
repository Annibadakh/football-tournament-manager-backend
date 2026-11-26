const config = require("./config/env");
const logger = require("./config/logger");
const app = require("./app");
const { sequelize } = require("./models");

const SHUTDOWN_TIMEOUT_MS = 10000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
  } catch (err) {
    logger.fatal({ err }, "Unable to connect to the database");
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} (${config.env})`);
  });

  // Finish in-flight requests and close DB connections before exiting
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
