const express = require("express");
const matchController = require("../controllers/match.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/match.schema");

const router = express.Router();

router.patch(
  "/:noticeId",
  authenticate,
  requireVerified,
  validate({ params: schemas.noticeIdParamSchema }),
  matchController.handleCardNotice,
);

module.exports = router;
