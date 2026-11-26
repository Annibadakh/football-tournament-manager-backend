const { Tournament, TournamentStaff, User } = require("../models");
const { LOCKING_STAFF_STATUSES } = require("../constants/team.constants");

const STAFF_INCLUDE = [
  {
    model: User,
    as: "user",
    attributes: ["id", "uuid", "fullName", "photoKey", "accountStatus", "email"],
  },
];

const findStaffByTournament = (tournamentId) =>
  TournamentStaff.findAll({
    where: { tournamentId, status: LOCKING_STAFF_STATUSES },
    include: STAFF_INCLUDE,
    order: [
      ["staffRole", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

const countStaffInRole = (tournamentId, staffRole, { transaction } = {}) =>
  TournamentStaff.count({
    where: { tournamentId, staffRole, status: LOCKING_STAFF_STATUSES },
    transaction,
  });

const findLockingStaff = (tournamentId, userId, staffRole, { transaction } = {}) =>
  TournamentStaff.findOne({
    where: { tournamentId, userId, staffRole, status: LOCKING_STAFF_STATUSES },
    transaction,
  });

const findStaffByUuid = (tournamentId, uuid) =>
  TournamentStaff.findOne({ where: { tournamentId, uuid }, include: STAFF_INCLUDE });

const findStaffById = (id, { transaction } = {}) =>
  TournamentStaff.findByPk(id, { include: STAFF_INCLUDE, transaction });

const findStaffByIds = (ids) =>
  TournamentStaff.findAll({
    where: { id: ids },
    include: [...STAFF_INCLUDE, { model: Tournament, as: "tournament" }],
  });

const createStaff = (data, { transaction } = {}) => TournamentStaff.create(data, { transaction });

const updateStaff = (staff, changes, { transaction } = {}) =>
  staff.update(changes, { transaction });

module.exports = {
  findStaffByTournament,
  countStaffInRole,
  findLockingStaff,
  findStaffByUuid,
  findStaffById,
  findStaffByIds,
  createStaff,
  updateStaff,
};
