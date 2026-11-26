const userService = require("../services/user.service");
const { sendSession } = require("./auth.controller");
const { sendSuccess } = require("../utils/apiResponse");
const { getClientContext } = require("../utils/requestContext");

const getMe = async (req, res) =>
  sendSuccess(res, { data: await userService.getMyProfile(req.user.id) });

const updateMe = async (req, res) => {
  const profile = await userService.updateMyProfile(req.user, req.validated.body);
  return sendSuccess(res, { data: profile, message: "Profile updated" });
};

const replaceMyPositions = async (req, res) => {
  const profile = await userService.replaceMyPositions(req.user, req.validated.body.positions);
  return sendSuccess(res, { data: profile, message: "Positions updated" });
};

const changeMyPassword = async (req, res) => {
  const session = await userService.changeMyPassword(
    req.user,
    req.validated.body,
    getClientContext(req),
  );
  return sendSession(
    req,
    res,
    { user: req.user, session },
    { message: "Password changed. Other devices were signed out." },
  );
};

module.exports = { getMe, updateMe, replaceMyPositions, changeMyPassword };
