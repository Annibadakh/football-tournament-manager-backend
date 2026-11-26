const crypto = require("crypto");
const storageService = require("./storage.service");
const { findManageableTournament } = require("./tournamentAccess.service");
const ApiError = require("../utils/ApiError");
const {
  UPLOAD_PURPOSE,
  CONTENT_TYPE_EXTENSIONS,
  PRESIGNED_POST_TTL_SECONDS,
  UPLOAD_RULES,
} = require("../constants/upload.constants");

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

const TOURNAMENT_PURPOSES = [UPLOAD_PURPOSE.TOURNAMENT_LOGO, UPLOAD_PURPOSE.TOURNAMENT_BANNER];

// Files are filed under their owner: the user for profile photos, the tournament for its images
const resolveOwnerUuid = async (user, purpose, entityId) => {
  if (!TOURNAMENT_PURPOSES.includes(purpose)) return user.uuid;
  if (!entityId) throw fieldError("entityId", "Tournament is required for this upload");
  return (await findManageableTournament(user, entityId)).uuid;
};

const createUpload = async (user, { purpose, contentType, size, entityId }) => {
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

  const ownerUuid = await resolveOwnerUuid(user, purpose, entityId);
  const key = `${rules.keyPrefix(ownerUuid)}${crypto.randomUUID()}.${CONTENT_TYPE_EXTENSIONS[contentType]}`;
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

// Called before saving a key: it must belong to this owner and purpose and actually exist in S3
const assertUploadedFile = async (purpose, ownerUuid, key, field) => {
  const rules = UPLOAD_RULES[purpose];
  if (!key.startsWith(rules.keyPrefix(ownerUuid)))
    throw fieldError(field, "Invalid file reference");

  const metadata = await storageService.getObjectMetadata(key);
  if (!metadata) throw fieldError(field, "Uploaded file not found. Please upload it again");
  if (!rules.contentTypes.includes(metadata.contentType) || metadata.size > rules.maxBytes) {
    throw fieldError(field, "Uploaded file is not allowed");
  }
};

module.exports = { createUpload, assertUploadedFile };
