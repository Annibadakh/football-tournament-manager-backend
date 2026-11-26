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

const updateInvite = (invite, changes, { transaction } = {}) =>
  invite.update(changes, { transaction });

module.exports = { createInvite, findInviteByHash, revokePendingInvites, updateInvite };
