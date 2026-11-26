const express = require("express");
const placeController = require("../controllers/place.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/place.schema");

const router = express.Router();

// Logged-in only: every call costs Google quota
router.use(authenticate, requireVerified);
router.get(
  "/autocomplete",
  validate({ query: schemas.placeSearchQuerySchema }),
  placeController.searchPlaces,
);
router.post("/", validate({ body: schemas.resolvePlaceSchema }), placeController.resolvePlace);

module.exports = router;
