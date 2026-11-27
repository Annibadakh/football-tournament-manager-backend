const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const inviteRoutes = require("./invite.routes");
const awardRoutes = require("./award.routes");
const cardNoticeRoutes = require("./cardNotice.routes");
const streamRoutes = require("./stream.routes");
const matchRoutes = require("./match.routes");
const meRoutes = require("./me.routes");
const paymentRoutes = require("./payment.routes");
const placeRoutes = require("./place.routes");
const playerRoutes = require("./player.routes");
const teamRoutes = require("./team.routes");
const positionRoutes = require("./position.routes");
const ruleRoutes = require("./rule.routes");
const tournamentRoutes = require("./tournament.routes");
const tournamentController = require("../controllers/tournament.controller");
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
router.use("/places", placeRoutes);
router.use("/rules", ruleRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/teams", teamRoutes);
router.use("/players", playerRoutes);
router.use("/payments", paymentRoutes);
router.use("/matches", matchRoutes);
router.use("/card-notices", cardNoticeRoutes);
router.use("/streams", streamRoutes);
router.use("/awards", awardRoutes);
router.get("/tournament-categories", tournamentController.listCategories);

module.exports = router;
