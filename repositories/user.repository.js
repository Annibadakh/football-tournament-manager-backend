const { escapeLike } = require("../utils/sql");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");
const { Op } = require("sequelize");
const { User, Position, Place } = require("../models");
const { PLACE_ATTRIBUTES } = require("./place.repository");

const POSITION_INCLUDE = {
  model: Position,
  as: "positions",
  attributes: ["id", "code", "name", "shortName", "sortOrder"],
  through: { attributes: ["isPrimary"] },
};

const findUserById = (id, { transaction } = {}) => User.findByPk(id, { transaction });

const findUserByUuid = (uuid, { transaction } = {}) =>
  User.findOne({ where: { uuid }, transaction });

const CITY_INCLUDE = { model: Place, as: "city", attributes: PLACE_ATTRIBUTES };

const findUserByUuidWithPositions = (uuid) =>
  User.findOne({ where: { uuid }, include: [POSITION_INCLUDE, CITY_INCLUDE] });

const findUserByIdWithPositions = (id, { transaction } = {}) =>
  User.findByPk(id, { include: [POSITION_INCLUDE, CITY_INCLUDE], transaction });

const findUserByEmail = (email, { transaction, withPassword = false } = {}) =>
  (withPassword ? User.scope("withPassword") : User).findOne({ where: { email }, transaction });

const findUserByIdWithPassword = (id, { transaction } = {}) =>
  User.scope("withPassword").findByPk(id, { transaction });

const findUserByPhone = (phone, { transaction } = {}) =>
  User.findOne({ where: { phone }, transaction });

const createUser = (data, { transaction } = {}) => User.create(data, { transaction });

const updateUser = (user, changes, { transaction } = {}) => user.update(changes, { transaction });

const findUsersPage = ({ search, accountRole, accountStatus, limit, offset, order }) => {
  const where = {};
  if (accountRole) where.accountRole = accountRole;
  if (accountStatus) where.accountStatus = accountStatus;
  if (search) {
    const term = `%${escapeLike(search)}%`;
    where[Op.or] = [
      { fullName: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { phone: { [Op.like]: term } },
    ];
  }
  return User.findAndCountAll({
    where,
    attributes: [
      "uuid",
      "fullName",
      "email",
      "phone",
      "accountRole",
      "accountStatus",
      "lastLoginAt",
      "createdAt",
    ],
    limit,
    offset,
    order,
  });
};

// Verified players only; contact details are never selected
const findVerifiedPlayersPage = ({ search, limit, offset }) => {
  const where = { accountRole: ACCOUNT_ROLE.MEMBER, accountStatus: ACCOUNT_STATUS.VERIFIED };
  if (search) where.fullName = { [Op.like]: `%${escapeLike(search)}%` };
  return User.findAndCountAll({
    where,
    attributes: ["id", "uuid", "fullName", "photoKey", "accountStatus", "dateOfBirth"],
    include: [POSITION_INCLUDE, CITY_INCLUDE],
    order: [["fullName", "ASC"]],
    limit,
    offset,
    distinct: true,
  });
};

module.exports = {
  findVerifiedPlayersPage,
  findUserById,
  findUserByUuid,
  findUserByUuidWithPositions,
  findUserByIdWithPositions,
  findUserByEmail,
  findUserByIdWithPassword,
  findUserByPhone,
  createUser,
  updateUser,
  findUsersPage,
};
