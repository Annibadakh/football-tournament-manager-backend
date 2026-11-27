// Stored as TINYINT; labels live in the frontend
const STREAM_STATUS = Object.freeze({
  SCHEDULED: 1,
  LIVE: 2,
  ENDED: 3,
});

const STREAM_RULES = Object.freeze({
  TITLE_MIN: 3,
  TITLE_MAX: 120,
  URL_MAX: 300,
  OEMBED_TIMEOUT_MS: 4000,
});

module.exports = { STREAM_STATUS, STREAM_RULES };
