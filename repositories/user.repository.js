const { Op } = require("sequelize");
const { User, Position } = require("../models");

const POSITION_INCLUDE = {
  model: Position,
  as: "positions",
  attributes: ["id", "code", "name", "shortName", "sortOrder"],
  through: { attributes: ["isPrimary"] },
};

const findUserById = (id, { transaction } = {}) => User.findByPk(id, { transaction });

const findUserByUuid = (uuid, { transaction } = {}) =>
  User.findOne({ where: { uuid }, transaction });

const findUserByUuidWithPositions = (uuid) =>
  User.findOne({ where: { uuid }, include: [POSITION_INCLUDE] });

const findUserByIdWithPositions = (id, { transaction } = {}) =>
  User.findByPk(id, { include: [POSITION_INCLUDE], transaction });

const findUserByEmail = (email, { transaction, withPassword = false } = {}) =>
  (withPassword ? User.scope("withPassword") : User).findOne({ where: { email }, transaction });

const findUserByIdWithPassword = (id, { transaction } = {}) =>
  User.scope("withPassword").findByPk(id, { transaction });

const findUserByPhone = (phone, { transaction } = {}) =>
  User.findOne({ where: { phone }, transaction });

const createUser = (data, { transaction } = {}) => User.create(data, { transaction });

const updateUser = (user, changes, { transaction } = {}) => user.update(changes, { transaction });

// Escapes % and _ so a search for "50%" doesn't match everything
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

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

module.exports = {
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
