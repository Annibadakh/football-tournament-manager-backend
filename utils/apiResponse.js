const { HTTP_STATUS } = require("../constants/common.constants");

// Single success shape for every endpoint (docs/02-api-response-standard.md)
const sendSuccess = (
  res,
  { data = null, message = "Success", meta, status = HTTP_STATUS.OK } = {},
) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

const buildErrorBody = ({ message, code, errors }) => {
  const body = { success: false, message, code };
  if (errors?.length) body.errors = errors;
  return body;
};

module.exports = { sendSuccess, buildErrorBody };
