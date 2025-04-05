const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/dashboard", authenticate("admin"), getDashboard);

module.exports = router;

