const uploadService = require("../services/upload.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const createUpload = async (req, res) => {
  const upload = await uploadService.createUpload(req.user, req.validated.body);
  return sendSuccess(res, {
    data: upload,
    message: "Upload URL created",
    status: HTTP_STATUS.CREATED,
  });
};

module.exports = { createUpload };
