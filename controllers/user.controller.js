const userService = require("../services/user.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const listUsers = async (req, res) => {
  const { items, meta } = await userService.listUsers(req.validated.query);
  return sendSuccess(res, { data: items, meta, message: "Users fetched" });
};

const createUser = async (req, res) => {
  const user = await userService.createStaffUser(req.user, req.validated.body);
  return sendSuccess(res, {
    data: user,
    message: "Account created and invite sent",
    status: HTTP_STATUS.CREATED,
  });
};

const updateUserStatus = async (req, res) => {
  const user = await userService.updateUserBlockStatus(
    req.user,
    req.validated.params.userId,
    req.validated.body,
  );
  return sendSuccess(res, {
    data: user,
    message: req.validated.body.isBlocked ? "Account blocked" : "Account unblocked",
  });
};

const resendUserInvite = async (req, res) => {
  await userService.resendAccountInvite(req.user, req.validated.params.userId);
  return sendSuccess(res, { message: "Invite sent again" });
};

module.exports = { listUsers, createUser, updateUserStatus, resendUserInvite };
