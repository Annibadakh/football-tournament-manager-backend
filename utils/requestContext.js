const { CLIENT_PLATFORM } = require("../constants/auth.constants");

// Who is calling: platform header (web/android/ios), user agent and IP, stored with each session
const getClientContext = (req) => {
  const platform = String(req.headers["x-client-platform"] ?? "").toLowerCase();
  return {
    platform: Object.values(CLIENT_PLATFORM).includes(platform) ? platform : CLIENT_PLATFORM.WEB,
    userAgent: req.headers["user-agent"] ?? null,
    ipAddress: req.ip ?? null,
  };
};

module.exports = { getClientContext };
