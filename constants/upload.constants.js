const MB = 1024 * 1024;

const UPLOAD_PURPOSE = Object.freeze({
  PROFILE_PHOTO: 1,
});

// Per-purpose limits; S3 enforces size and type through the presigned POST policy
const UPLOAD_RULES = Object.freeze({
  [UPLOAD_PURPOSE.PROFILE_PHOTO]: {
    maxBytes: 2 * MB,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    keyPrefix: (userUuid) => `users/${userUuid}/profile/`,
  },
});

const PRESIGNED_POST_TTL_SECONDS = 300;

const CONTENT_TYPE_EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

module.exports = {
  UPLOAD_PURPOSE,
  UPLOAD_RULES,
  PRESIGNED_POST_TTL_SECONDS,
  CONTENT_TYPE_EXTENSIONS,
};
