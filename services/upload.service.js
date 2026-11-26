const crypto = require("crypto");
const storageService = require("./storage.service");
const ApiError = require("../utils/ApiError");
const {
  CONTENT_TYPE_EXTENSIONS,
  PRESIGNED_POST_TTL_SECONDS,
  UPLOAD_RULES,
} = require("../constants/upload.constants");

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

const createUpload = async (user, { purpose, contentType, size }) => {
  const rules = UPLOAD_RULES[purpose];
  if (!rules.contentTypes.includes(contentType)) {
    throw fieldError("contentType", `Allowed file types: ${rules.contentTypes.join(", ")}`);
  }
  if (size > rules.maxBytes) {
    throw fieldError(
      "size",
      `File is too large. Maximum size is ${Math.round(rules.maxBytes / 1024 / 1024)} MB`,
    );
  }

  const key = `${rules.keyPrefix(user.uuid)}${crypto.randomUUID()}.${CONTENT_TYPE_EXTENSIONS[contentType]}`;
  const post = await storageService.createUploadPost({
    key,
    contentType,
    maxBytes: rules.maxBytes,
    expiresInSeconds: PRESIGNED_POST_TTL_SECONDS,
  });

  return {
    url: post.url,
    fields: post.fields,
    key,
    expiresIn: PRESIGNED_POST_TTL_SECONDS,
    maxBytes: rules.maxBytes,
  };
};

// Called before saving a key: it must be this user's file for this purpose and actually exist in S3
const assertUploadedFile = async (user, purpose, key, field) => {
  const rules = UPLOAD_RULES[purpose];
  if (!key.startsWith(rules.keyPrefix(user.uuid)))
    throw fieldError(field, "Invalid file reference");

  const metadata = await storageService.getObjectMetadata(key);
  if (!metadata) throw fieldError(field, "Uploaded file not found. Please upload it again");
  if (!rules.contentTypes.includes(metadata.contentType) || metadata.size > rules.maxBytes) {
    throw fieldError(field, "Uploaded file is not allowed");
  }
};

module.exports = { createUpload, assertUploadedFile };
