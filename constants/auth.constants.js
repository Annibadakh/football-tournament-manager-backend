const OTP_PURPOSE = Object.freeze({
  EMAIL_VERIFY: 1,
  PASSWORD_RESET: 2,
});

const OTP_RULES = Object.freeze({
  LENGTH: 6,
  TTL_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
});

const CLIENT_PLATFORM = Object.freeze({
  WEB: "web",
  ANDROID: "android",
  IOS: "ios",
});

const REFRESH_COOKIE = Object.freeze({
  NAME: "maidaan_rt",
  // Cookie is only sent to auth endpoints, never to the rest of the API
  PATH: "/api/v1/auth",
});

const JWT_OPTIONS = Object.freeze({
  ISSUER: "maidaan-api",
  AUDIENCE: "maidaan-clients",
  ALGORITHM: "HS256",
});

module.exports = { OTP_PURPOSE, OTP_RULES, CLIENT_PLATFORM, REFRESH_COOKIE, JWT_OPTIONS };
