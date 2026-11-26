const express = require("express");
const inviteController = require("../controllers/invite.controller");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const { optionalAuthenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/invite.schema");

const router = express.Router();

router.get(
  "/:token",
  validate({ params: schemas.inviteTokenParamSchema }),
  inviteController.getInvite,
);
router.post(
  "/:token/acceptance",
  authLimiter,
  optionalAuthenticate,
  validate({ params: schemas.inviteTokenParamSchema, body: schemas.acceptInviteSchema }),
  inviteController.acceptInvite,
);

router.post(
  "/:token/decline",
  authLimiter,
  validate({ params: schemas.inviteTokenParamSchema }),
  inviteController.declineInvite,
);

module.exports = router;
