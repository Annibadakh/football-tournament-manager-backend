const { Op } = require("sequelize");
const { Invite, User } = require("../models");
const { INVITE_STATUS } = require("../constants/invite.constants");

const createInvite = (data, { transaction } = {}) => Invite.create(data, { transaction });

const findInviteByHash = (tokenHash, { transaction } = {}) =>
  Invite.findOne({
    where: { tokenHash },
    include: [
      { model: User, as: "user" },
      { model: User, as: "inviter", attributes: ["fullName"] },
    ],
    transaction,
  });

const revokePendingInvites = (userId, type, { transaction } = {}) =>
  Invite.update(
    { status: INVITE_STATUS.REVOKED },
    { where: { userId, type, status: INVITE_STATUS.PENDING }, transaction },
  );

// Revokes the pending invite tied to a team member or staff row (payload id)
const revokePendingInvitesForPayload = (type, payloadKey, payloadId, { transaction } = {}) =>
  Invite.update(
    { status: INVITE_STATUS.REVOKED },
    {
      where: { type, status: INVITE_STATUS.PENDING, payload: { [payloadKey]: payloadId } },
      transaction,
    },
  );

const revokeInvitesForPayloadIds = (type, payloadKey, payloadIds, { transaction } = {}) =>
  payloadIds.length
    ? Invite.update(
        { status: INVITE_STATUS.REVOKED },
        {
          where: {
            type,
            status: INVITE_STATUS.PENDING,
            payload: { [payloadKey]: { [Op.in]: payloadIds } },
          },
          transaction,
        },
      )
    : Promise.resolve();

const findPendingInvitesForUser = (userId, types) =>
  Invite.findAll({
    where: {
      userId,
      type: types,
      status: INVITE_STATUS.PENDING,
      expiresAt: { [Op.gt]: new Date() },
    },
    include: [{ model: User, as: "inviter", attributes: ["fullName"] }],
    order: [["createdAt", "DESC"]],
  });

const findInviteByUuid = (uuid, { transaction } = {}) =>
  Invite.findOne({
    where: { uuid },
    include: [
      { model: User, as: "user" },
      { model: User, as: "inviter", attributes: ["fullName"] },
    ],
    transaction,
  });

const updateInvite = (invite, changes, { transaction } = {}) =>
  invite.update(changes, { transaction });

module.exports = {
  createInvite,
  findInviteByHash,
  findInviteByUuid,
  findPendingInvitesForUser,
  revokePendingInvites,
  revokePendingInvitesForPayload,
  revokeInvitesForPayloadIds,
  updateInvite,
};
