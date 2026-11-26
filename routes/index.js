const express = require("express");
const healthRoutes = require("./health.routes");

// Every module router is mounted here under /api/v1
const router = express.Router();

router.use("/health", healthRoutes);

module.exports = router;
