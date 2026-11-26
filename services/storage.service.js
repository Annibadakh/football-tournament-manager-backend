const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const config = require("../config/env");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

// Credentials come from the standard AWS env vars or the host's IAM role
const s3 = new S3Client({
  region: config.storage.region,
  ...(config.storage.endpoint && { endpoint: config.storage.endpoint, forcePathStyle: true }),
});

const assertStorageConfigured = () => {
  if (!config.storage.isConfigured) {
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "File uploads are not configured",
    );
  }
};

// S3 enforces both conditions, so oversized or wrong-type files are rejected at upload time
const createUploadPost = async ({ key, contentType, maxBytes, expiresInSeconds }) => {
  assertStorageConfigured();
  return createPresignedPost(s3, {
    Bucket: config.storage.bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, maxBytes],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: expiresInSeconds,
  });
};

const getObjectMetadata = async (key) => {
  assertStorageConfigured();
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: config.storage.bucket, Key: key }));
    return { size: head.ContentLength, contentType: head.ContentType };
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound") return null;
    throw err;
  }
};

// Bucket is private; every read goes through a short-lived signed URL
const getReadUrl = (key) => {
  if (!key || !config.storage.isConfigured) return Promise.resolve(null);
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.storage.bucket, Key: key }), {
    expiresIn: config.storage.signedUrlTtlSeconds,
  });
};

// Old files are cleaned up best-effort; a failed delete must not fail the user's request
const deleteObjectQuietly = async (key) => {
  if (!key || !config.storage.isConfigured) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key }));
  } catch (err) {
    logger.warn({ err, key }, "Failed to delete old file");
  }
};

module.exports = { createUploadPost, getObjectMetadata, getReadUrl, deleteObjectQuietly };
