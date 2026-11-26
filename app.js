const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const config = require("./config/env");
const logger = require("./config/logger");
const routes = require("./routes");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const { REQUEST_BODY_LIMIT, API_PREFIX } = require("./constants/common.constants");

const app = express();

// Behind a proxy (Render/Nginx) so rate limiting sees the real client IP
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const requestId = req.headers["x-request-id"] || crypto.randomUUID();
      res.setHeader("X-Request-Id", requestId);
      return requestId;
    },
  }),
);

// Allow images served from this API to be embedded by the frontend origin
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(cookieParser());

app.use(API_PREFIX, apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
