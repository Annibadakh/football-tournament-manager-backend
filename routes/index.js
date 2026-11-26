const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const inviteRoutes = require("./invite.routes");
const meRoutes = require("./me.routes");
const positionRoutes = require("./position.routes");
const uploadRoutes = require("./upload.routes");
const userRoutes = require("./user.routes");

// Every module router is mounted here under /api/v1
const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/me", meRoutes);
router.use("/users", userRoutes);
router.use("/invites", inviteRoutes);
router.use("/positions", positionRoutes);
router.use("/uploads", uploadRoutes);

module.exports = router;
