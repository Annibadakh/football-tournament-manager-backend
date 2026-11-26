const { APP_TIMEZONE } = require("../constants/common.constants");

// Today's date as YYYY-MM-DD in Indian time, comparable with DATEONLY columns
const todayInAppTimezone = (now = new Date()) =>
  now.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });

module.exports = { todayInAppTimezone };
