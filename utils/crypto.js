const crypto = require("crypto");

// Random URL-safe token for refresh tokens and invite links (only its hash is stored)
const generateToken = (bytes = 48) => crypto.randomBytes(bytes).toString("base64url");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Uniform random numeric code, e.g. "042917"
const generateNumericCode = (length) =>
  crypto
    .randomInt(0, 10 ** length)
    .toString()
    .padStart(length, "0");

// Constant-time comparison so response timing can't leak how much of a code matched
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

module.exports = { generateToken, sha256, generateNumericCode, safeEqual };
