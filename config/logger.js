const pino = require("pino");
const config = require("./env");

// Pretty output for local dev, structured JSON everywhere else
const logger = pino({
  level: config.logLevel,
  transport:
    config.env === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password"],
});

module.exports = logger;
