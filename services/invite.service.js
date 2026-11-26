const config = require("../config/env");
const { sequelize } = require("../models");
const inviteRepository = require("../repositories/invite.repository");
const userRepository = require("../repositories/user.repository");
const emailService = require("./email.service");
const tokenService = require("./token.service");
const emailTemplates = require("../utils/emailTemplates");
const ApiError = require("../utils/ApiError");
const { generateToken, sha256 } = require("../utils/crypto");
const { hashPassword, assertPhoneAvailable } = require("./password.service");
const { INVITE_STATUS, INVITE_TTL_DAYS, INVITE_TYPE } = require("../constants/invite.constants");
const { ACCOUNT_ROLE_LABEL, ACCOUNT_STATUS } = require("../constants/user.constants");

const DAY_MS = 24 * 60 * 60 * 1000;
const INVALID_INVITE_MESSAGE = "This invite link is invalid or has expired";

const buildInviteUrl = (token) => `${config.appUrl}/invites/${token}`;

// Revokes earlier links so only the newest email works
const createAccountSetupInvite = async (user, inviter, { transaction } = {}) => {
  await inviteRepository.revokePendingInvites(user.id, INVITE_TYPE.ACCOUNT_SETUP, { transaction });
  const token = generateToken(32);
  await inviteRepository.createInvite(
    {
      tokenHash: sha256(token),
      type: INVITE_TYPE.ACCOUNT_SETUP,
      userId: user.id,
      invitedBy: inviter?.id ?? null,
      status: INVITE_STATUS.PENDING,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS),
    },
    { transaction },
  );
  return buildInviteUrl(token);
};

const sendAccountSetupEmail = (user, inviter, url) =>
  emailService.sendEmail({
    to: user.email,
    ...emailTemplates.accountSetupInvite({
      fullName: user.fullName,
      inviterName: inviter?.fullName ?? "Maidaan",
      roleLabel: ACCOUNT_ROLE_LABEL[user.accountRole],
      url,
      ttlDays: INVITE_TTL_DAYS,
    }),
  });

const findUsableInvite = async (token, { transaction } = {}) => {
  const invite = await inviteRepository.findInviteByHash(sha256(token), { transaction });
  if (!invite || invite.status !== INVITE_STATUS.PENDING)
    throw ApiError.notFound(INVALID_INVITE_MESSAGE);
  if (invite.expiresAt < new Date()) {
    await inviteRepository.updateInvite(invite, { status: INVITE_STATUS.EXPIRED });
    throw ApiError.notFound(INVALID_INVITE_MESSAGE);
  }
  return invite;
};

const getInviteDetails = async (token) => {
  const invite = await findUsableInvite(token);
  return {
    type: invite.type,
    fullName: invite.user.fullName,
    email: invite.user.email,
    accountRole: invite.user.accountRole,
    invitedBy: invite.inviter?.fullName ?? null,
    expiresAt: invite.expiresAt,
  };
};

// The link proves email ownership, so accepting verifies the account in one step
const acceptAccountSetupInvite = async (token, { fullName, password, phone }, context) => {
  const passwordHash = await hashPassword(password);

  const user = await sequelize.transaction(async (transaction) => {
    const invite = await findUsableInvite(token, { transaction });
    const invitedUser = invite.user;
    if (invitedUser.accountStatus === ACCOUNT_STATUS.BLOCKED)
      throw ApiError.forbidden("This account has been blocked");
    await assertPhoneAvailable(phone, invitedUser.id, { transaction });

    await userRepository.updateUser(
      invitedUser,
      {
        fullName: fullName ?? invitedUser.fullName,
        passwordHash,
        phone,
        emailVerifiedAt: new Date(),
        accountStatus: ACCOUNT_STATUS.VERIFIED,
      },
      { transaction },
    );
    await inviteRepository.updateInvite(
      invite,
      { status: INVITE_STATUS.ACCEPTED, acceptedAt: new Date() },
      { transaction },
    );
    return invitedUser;
  });

  const session = await tokenService.createSession(user, context);
  return { user, session };
};

module.exports = {
  createAccountSetupInvite,
  sendAccountSetupEmail,
  getInviteDetails,
  acceptAccountSetupInvite,
};
