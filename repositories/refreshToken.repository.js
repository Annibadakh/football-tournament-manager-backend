const { Op } = require("sequelize");
const { RefreshToken } = require("../models");

const createRefreshToken = (data, { transaction } = {}) =>
  RefreshToken.create(data, { transaction });

const findRefreshTokenByHash = (tokenHash, { transaction } = {}) =>
  RefreshToken.findOne({
    where: { tokenHash },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

const revokeRefreshToken = (token, replacedById, { transaction } = {}) =>
  token.update({ revokedAt: new Date(), replacedById }, { transaction });

const revokeTokenFamily = (familyId, { transaction } = {}) =>
  RefreshToken.update(
    { revokedAt: new Date() },
    { where: { familyId, revokedAt: { [Op.is]: null } }, transaction },
  );

const revokeAllUserTokens = (userId, { transaction } = {}) =>
  RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: { [Op.is]: null } }, transaction },
  );

module.exports = {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
};
