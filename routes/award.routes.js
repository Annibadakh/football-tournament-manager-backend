const express = require("express");
const profileController = require("../controllers/profile.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { awardIdParamSchema } = require("../validations/profile.schema");

const router = express.Router();

router.delete(
  "/:awardId",
  authenticate,
  requireVerified,
  validate({ params: awardIdParamSchema }),
  profileController.deleteAward,
);

module.exports = router;
