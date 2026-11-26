const inviteService = require("../services/invite.service");
const { sendSession } = require("./auth.controller");
const { sendSuccess } = require("../utils/apiResponse");
const { getClientContext } = require("../utils/requestContext");

const getInvite = async (req, res) => {
  const invite = await inviteService.getInviteDetails(req.validated.params.token);
  return sendSuccess(res, { data: invite, message: "Invite is valid" });
};

const acceptInvite = async (req, res) => {
  const result = await inviteService.acceptAccountSetupInvite(
    req.validated.params.token,
    req.validated.body,
    getClientContext(req),
  );
  return sendSession(req, res, result, { message: "Your account is ready" });
};

module.exports = { getInvite, acceptInvite };
