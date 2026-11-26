const express = require("express");
const meController = require("../controllers/me.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/user.schema");

const router = express.Router();

// Reading /me is allowed before verification so the app knows to show the verify screen
router.use(authenticate);
router.get("/", meController.getMe);
router.patch(
  "/",
  requireVerified,
  validate({ body: schemas.updateProfileSchema }),
  meController.updateMe,
);
router.put(
  "/positions",
  requireVerified,
  validate({ body: schemas.replacePositionsSchema }),
  meController.replaceMyPositions,
);
router.patch(
  "/password",
  validate({ body: schemas.changePasswordSchema }),
  meController.changeMyPassword,
);

module.exports = router;
