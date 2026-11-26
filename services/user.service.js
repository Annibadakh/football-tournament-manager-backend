const { sequelize } = require("../models");
const userRepository = require("../repositories/user.repository");
const positionRepository = require("../repositories/position.repository");
const inviteService = require("./invite.service");
const storageService = require("./storage.service");
const tokenService = require("./token.service");
const uploadService = require("./upload.service");
const { toPositionResponse } = require("./position.service");
const placeService = require("./place.service");
const { hashPassword, verifyPassword } = require("./password.service");
const ApiError = require("../utils/ApiError");
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");
const {
  ACCOUNT_ROLE,
  ACCOUNT_STATUS,
  CREATABLE_ROLES_BY_ROLE,
} = require("../constants/user.constants");
const { UPLOAD_PURPOSE } = require("../constants/upload.constants");

const SORTABLE_USER_FIELDS = ["fullName", "email", "createdAt", "lastLoginAt"];

// Public shape of a user: uuid as id, never the internal id or password hash
const presentUser = async (user) => {
  const positions = (user.positions ?? [])
    .map((position) => ({
      ...toPositionResponse(position),
      isPrimary: position.UserPosition.isPrimary,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  return {
    id: user.uuid,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    accountRole: user.accountRole,
    accountStatus: user.accountStatus,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    city: placeService.presentPlace(user.city),
    bio: user.bio,
    photoUrl: await storageService.getReadUrl(user.photoKey),
    positions,
    createdAt: user.createdAt,
  };
};

const presentUserListItem = (user) => ({
  id: user.uuid,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  accountRole: user.accountRole,
  accountStatus: user.accountStatus,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const getMyProfile = async (userId) =>
  presentUser(await userRepository.findUserByIdWithPositions(userId));

const updateMyProfile = async (user, changes) => {
  const previousPhotoKey = user.photoKey;
  if (changes.photoKey) {
    await uploadService.assertUploadedFile(
      UPLOAD_PURPOSE.PROFILE_PHOTO,
      user.uuid,
      changes.photoKey,
      "photoKey",
    );
  }

  const resolved = { ...changes };
  if ("cityPlaceId" in changes)
    resolved.cityPlaceId = await placeService.findPlaceIdByUuid(changes.cityPlaceId, "cityPlaceId");
  await userRepository.updateUser(user, { ...resolved, updatedBy: user.id });

  const isPhotoReplaced =
    changes.photoKey !== undefined && previousPhotoKey && previousPhotoKey !== changes.photoKey;
  if (isPhotoReplaced) await storageService.deleteObjectQuietly(previousPhotoKey);
  return getMyProfile(user.id);
};

const replaceMyPositions = async (user, positions) => {
  const positionIds = positions.map((position) => position.positionId);
  if ((await positionRepository.countPositionsByIds(positionIds)) !== positionIds.length) {
    throw ApiError.badRequest("Unknown position selected", [
      { field: "positions", message: "Unknown position" },
    ]);
  }
  await sequelize.transaction((transaction) =>
    positionRepository.replaceUserPositions(user.id, positions, { transaction }),
  );
  return getMyProfile(user.id);
};

// Signs out every device, then returns a fresh session for the current one
const changeMyPassword = async (user, { currentPassword, newPassword }, context) => {
  const userWithPassword = await userRepository.findUserByIdWithPassword(user.id);
  if (!(await verifyPassword(currentPassword, userWithPassword.passwordHash))) {
    const message = "Current password is incorrect";
    throw ApiError.badRequest(message, [{ field: "currentPassword", message }]);
  }

  const passwordHash = await hashPassword(newPassword);
  await sequelize.transaction(async (transaction) => {
    await userRepository.updateUser(userWithPassword, { passwordHash }, { transaction });
    await tokenService.revokeAllSessions(user.id, { transaction });
  });
  return tokenService.createSession(user, context);
};

const listUsers = async (query) => {
  const pagination = buildPagination(query, {
    sortableFields: SORTABLE_USER_FIELDS,
    defaultSort: ["createdAt", "desc"],
  });
  const { rows, count } = await userRepository.findUsersPage({ ...query, ...pagination });
  return {
    items: rows.map(presentUserListItem),
    meta: buildPaginationMeta({ ...pagination, total: count }),
  };
};

// Lower role number = more power; you can only manage accounts strictly below your own role
const canManage = (actor, target) =>
  actor.id !== target.id && actor.accountRole < target.accountRole;

const findManageableUser = async (actor, userUuid) => {
  const target = await userRepository.findUserByUuid(userUuid);
  if (!target) throw ApiError.notFound("User not found");
  if (!canManage(actor, target)) throw ApiError.forbidden("You can't manage this account");
  return target;
};

const createStaffUser = async (actor, { fullName, email, accountRole }) => {
  if (!CREATABLE_ROLES_BY_ROLE[actor.accountRole]?.includes(accountRole)) {
    throw ApiError.forbidden("You can't create accounts with this role");
  }
  if (await userRepository.findUserByEmail(email)) {
    const message = "An account with this email already exists";
    throw ApiError.conflict(message, [{ field: "email", message }]);
  }

  const { user, inviteUrl } = await sequelize.transaction(async (transaction) => {
    const createdUser = await userRepository.createUser(
      { fullName, email, accountRole, accountStatus: ACCOUNT_STATUS.GUEST, createdBy: actor.id },
      { transaction },
    );
    const url = await inviteService.createAccountSetupInvite(createdUser, actor, { transaction });
    return { user: createdUser, inviteUrl: url };
  });

  await inviteService.sendAccountSetupEmail(user, actor, inviteUrl);
  return presentUserListItem(user);
};

// Unblocking restores the status the account would naturally have
const statusAfterUnblock = (user) => {
  if (user.emailVerifiedAt) return ACCOUNT_STATUS.VERIFIED;
  return user.accountRole === ACCOUNT_ROLE.MEMBER
    ? ACCOUNT_STATUS.PENDING_VERIFICATION
    : ACCOUNT_STATUS.GUEST;
};

const updateUserBlockStatus = async (actor, userUuid, { isBlocked }) => {
  const target = await findManageableUser(actor, userUuid);
  const accountStatus = isBlocked ? ACCOUNT_STATUS.BLOCKED : statusAfterUnblock(target);

  await sequelize.transaction(async (transaction) => {
    await userRepository.updateUser(
      target,
      { accountStatus, updatedBy: actor.id },
      { transaction },
    );
    if (isBlocked) await tokenService.revokeAllSessions(target.id, { transaction });
  });
  return presentUserListItem(target);
};

const resendAccountInvite = async (actor, userUuid) => {
  const target = await findManageableUser(actor, userUuid);
  if (target.accountStatus !== ACCOUNT_STATUS.GUEST) {
    throw ApiError.conflict("This account is already set up");
  }
  const inviteUrl = await inviteService.createAccountSetupInvite(target, actor);
  await inviteService.sendAccountSetupEmail(target, actor, inviteUrl);
};

// A verified player picked from search (userId) or a guest added by name + email
const resolveInvitee = async ({ userId, fullName, email }, actor, field, { transaction } = {}) => {
  if (!userId) return findOrCreateGuest({ fullName, email }, actor, { transaction });
  const user = await userRepository.findUserByUuid(userId, { transaction });
  const isVerifiedPlayer =
    user?.accountRole === ACCOUNT_ROLE.MEMBER && user.accountStatus === ACCOUNT_STATUS.VERIFIED;
  if (!isVerifiedPlayer)
    throw ApiError.badRequest("Choose a verified player", [
      { field, message: "Choose a verified player" },
    ]);
  return user;
};

/**
 * Used by squad/staff flows (Phase 3): reuses an unclaimed account or creates a guest.
 * A verified account is never reused silently (business rule 2.3).
 */
const findOrCreateGuest = async ({ fullName, email }, actor, { transaction } = {}) => {
  const existing = await userRepository.findUserByEmail(email, { transaction });
  if (existing) {
    if (existing.accountStatus === ACCOUNT_STATUS.VERIFIED) {
      throw ApiError.conflict(
        "This email belongs to a verified player. Add them as a verified player instead.",
        [{ field: "email", message: "Verified player exists with this email" }],
      );
    }
    if (existing.accountStatus === ACCOUNT_STATUS.BLOCKED)
      throw ApiError.conflict("This account is blocked");
    return existing;
  }
  return userRepository.createUser(
    {
      fullName,
      email,
      accountRole: ACCOUNT_ROLE.MEMBER,
      accountStatus: ACCOUNT_STATUS.GUEST,
      createdBy: actor.id,
    },
    { transaction },
  );
};

module.exports = {
  presentUser,
  getMyProfile,
  updateMyProfile,
  replaceMyPositions,
  changeMyPassword,
  listUsers,
  createStaffUser,
  updateUserBlockStatus,
  resendAccountInvite,
  findOrCreateGuest,
  resolveInvitee,
};
