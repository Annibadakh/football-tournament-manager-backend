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
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const DAY_MS = 24 * 60 * 60 * 1000;
const INVALID_INVITE_MESSAGE = "This invite link is invalid or has expired";

/**
 * Team and staff services register how their invite types are accepted, declined and described.
 * This keeps invites generic without importing those services (no circular dependency).
 * handler = { accept(invite, { transaction }), decline(invite, { transaction }), describeMany(invites) → Map(inviteId → context) }
 */
const inviteHandlers = {};
const registerInviteHandler = (type, handler) => {
  inviteHandlers[type] = handler;
};

const buildInviteUrl = (token) => `${config.appUrl}/invites/${token}`;

// Unclaimed accounts (no password yet) set one up while accepting
const needsAccountSetup = (user) => user.accountStatus === ACCOUNT_STATUS.GUEST;

const createInvite = async ({ type, user, inviter, payload = null }, { transaction } = {}) => {
  const token = generateToken(32);
  const invite = await inviteRepository.createInvite(
    {
      tokenHash: sha256(token),
      type,
      userId: user.id,
      invitedBy: inviter?.id ?? null,
      status: INVITE_STATUS.PENDING,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS),
      payload,
    },
    { transaction },
  );
  return { invite, url: buildInviteUrl(token) };
};

// Revokes earlier links so only the newest email works
const createAccountSetupInvite = async (user, inviter, { transaction } = {}) => {
  await inviteRepository.revokePendingInvites(user.id, INVITE_TYPE.ACCOUNT_SETUP, { transaction });
  return (await createInvite({ type: INVITE_TYPE.ACCOUNT_SETUP, user, inviter }, { transaction }))
    .url;
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

const assertUsable = async (invite) => {
  if (!invite || invite.status !== INVITE_STATUS.PENDING)
    throw ApiError.notFound(INVALID_INVITE_MESSAGE);
  if (invite.expiresAt < new Date()) {
    await inviteRepository.updateInvite(invite, { status: INVITE_STATUS.EXPIRED });
    throw ApiError.notFound(INVALID_INVITE_MESSAGE);
  }
  return invite;
};

const findUsableInvite = async (token, { transaction } = {}) =>
  assertUsable(await inviteRepository.findInviteByHash(sha256(token), { transaction }));

const describeInvites = async (invites) => {
  const contexts = new Map();
  const byType = invites.reduce(
    (groups, invite) => ({ ...groups, [invite.type]: [...(groups[invite.type] ?? []), invite] }),
    {},
  );
  for (const [type, group] of Object.entries(byType)) {
    const described = (await inviteHandlers[type]?.describeMany(group)) ?? new Map();
    described.forEach((context, inviteId) => contexts.set(inviteId, context));
  }
  return contexts;
};

const presentInvite = (invite, context) => ({
  id: invite.uuid,
  type: invite.type,
  fullName: invite.user.fullName,
  email: invite.user.email,
  accountRole: invite.user.accountRole,
  needsAccountSetup: needsAccountSetup(invite.user),
  invitedBy: invite.inviter?.fullName ?? null,
  expiresAt: invite.expiresAt,
  context: context ?? null,
});

const getInviteDetails = async (token) => {
  const invite = await findUsableInvite(token);
  const contexts = await describeInvites([invite]);
  return presentInvite(invite, contexts.get(invite.id));
};

const markAccepted = (invite, { transaction }) =>
  inviteRepository.updateInvite(
    invite,
    { status: INVITE_STATUS.ACCEPTED, acceptedAt: new Date() },
    { transaction },
  );

const accountSetupErrors = ({ password, phone }) =>
  [
    !password && { field: "password", message: "Set a password to activate your account" },
    !phone && { field: "phone", message: "Mobile number is required" },
  ].filter(Boolean);

// Guests: the link proves email ownership, so accepting also verifies and activates the account
const acceptWithAccountSetup = async (token, { fullName, password, phone }, context) => {
  const errors = accountSetupErrors({ password, phone });
  if (errors.length) throw ApiError.badRequest("Complete your account details", errors);
  const passwordHash = await hashPassword(password);

  const user = await sequelize.transaction(async (transaction) => {
    const invite = await findUsableInvite(token, { transaction });
    const invitedUser = invite.user;
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
    await inviteHandlers[invite.type]?.accept(invite, { transaction });
    await markAccepted(invite, { transaction });
    return invitedUser;
  });

  return { user, session: await tokenService.createSession(user, context) };
};

const assertInviteeCanRespond = (invite, viewer) => {
  if (!viewer)
    throw ApiError.unauthorized(`Log in as ${invite.user.email} to respond to this invitation`);
  if (viewer.id !== invite.user.id)
    throw ApiError.forbidden("This invitation is for a different account");
  if (viewer.accountStatus !== ACCOUNT_STATUS.VERIFIED) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.VERIFICATION_REQUIRED,
      "Please verify your account first",
    );
  }
};

const acceptForExistingAccount = async (invite, viewer) => {
  assertInviteeCanRespond(invite, viewer);
  await sequelize.transaction(async (transaction) => {
    await inviteHandlers[invite.type]?.accept(invite, { transaction });
    await markAccepted(invite, { transaction });
  });
  return { user: invite.user, session: null };
};

/**
 * Email-link acceptance. Guests set up their account in the same step (and get a session);
 * existing accounts must be logged in as the invitee.
 */
const acceptInviteByToken = async (token, body, context, viewer) => {
  const invite = await findUsableInvite(token);
  if (invite.user.accountStatus === ACCOUNT_STATUS.BLOCKED)
    throw ApiError.forbidden("This account has been blocked");
  if (invite.type === INVITE_TYPE.ACCOUNT_SETUP || needsAccountSetup(invite.user)) {
    return acceptWithAccountSetup(token, body, context);
  }
  return acceptForExistingAccount(invite, viewer);
};

// The email token is proof enough to say no; no login needed
const declineInviteByToken = async (token) => {
  const invite = await findUsableInvite(token);
  await sequelize.transaction(async (transaction) => {
    await inviteHandlers[invite.type]?.decline(invite, { transaction });
    await inviteRepository.updateInvite(
      invite,
      { status: INVITE_STATUS.DECLINED },
      { transaction },
    );
  });
};

const IN_APP_TYPES = [INVITE_TYPE.TEAM_JOIN, INVITE_TYPE.STAFF_ASSIGN];

const listMyInvitations = async (user) => {
  const invites = await inviteRepository.findPendingInvitesForUser(user.id, IN_APP_TYPES);
  invites.forEach((invite) => {
    invite.user = user;
  });
  const contexts = await describeInvites(invites);
  return invites.map((invite) => presentInvite(invite, contexts.get(invite.id)));
};

const respondToInvitation = async (user, inviteUuid, { accept }) => {
  const invite = await assertUsable(await inviteRepository.findInviteByUuid(inviteUuid));
  if (!IN_APP_TYPES.includes(invite.type)) throw ApiError.notFound(INVALID_INVITE_MESSAGE);
  if (!accept) {
    assertInviteeCanRespond(invite, user);
    await sequelize.transaction(async (transaction) => {
      await inviteHandlers[invite.type].decline(invite, { transaction });
      await inviteRepository.updateInvite(
        invite,
        { status: INVITE_STATUS.DECLINED },
        { transaction },
      );
    });
    return;
  }
  await acceptForExistingAccount(invite, user);
};

module.exports = {
  registerInviteHandler,
  createInvite,
  createAccountSetupInvite,
  sendAccountSetupEmail,
  needsAccountSetup,
  getInviteDetails,
  acceptInviteByToken,
  declineInviteByToken,
  listMyInvitations,
  respondToInvitation,
};
