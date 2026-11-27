const express = require("express");
const streamController = require("../controllers/stream.controller");
const {
  authenticate,
  optionalAuthenticate,
  requireVerified,
} = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/stream.schema");

const router = express.Router();
const signedIn = [authenticate, requireVerified];
const stream = { params: schemas.streamIdParamSchema };

router.get("/:streamId", optionalAuthenticate, validate(stream), streamController.getStream);
router.patch(
  "/:streamId",
  ...signedIn,
  validate({ ...stream, body: schemas.updateStreamSchema }),
  streamController.updateStream,
);
router.delete("/:streamId", ...signedIn, validate(stream), streamController.deleteStream);

module.exports = router;
