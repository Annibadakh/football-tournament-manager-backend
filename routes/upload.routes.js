const express = require("express");
const uploadController = require("../controllers/upload.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { createUploadSchema } = require("../validations/upload.schema");

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireVerified,
  validate({ body: createUploadSchema }),
  uploadController.createUpload,
);

module.exports = router;
