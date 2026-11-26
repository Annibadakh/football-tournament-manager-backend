const inviteService = require("../services/invite.service");
const { sendSession } = require("./auth.controller");
const { sendSuccess } = require("../utils/apiResponse");
const { getClientContext } = require("../utils/requestContext");

const getInvite = async (req, res) =>
  sendSuccess(res, {
    data: await inviteService.getInviteDetails(req.validated.params.token),
    message: "Invite is valid",
  });

// Guests get a new session (account just activated); logged-in players keep theirs
const acceptInvite = async (req, res) => {
  const result = await inviteService.acceptInviteByToken(
    req.validated.params.token,
    req.validated.body,
    getClientContext(req),
    req.user,
  );
  if (result.session)
    return sendSession(req, res, result, {
      message: "Invitation accepted. Your account is ready.",
    });
  return sendSuccess(res, { message: "Invitation accepted" });
};

const declineInvite = async (req, res) => {
  await inviteService.declineInviteByToken(req.validated.params.token);
  return sendSuccess(res, { message: "Invitation declined" });
};

module.exports = { getInvite, acceptInvite, declineInvite };
