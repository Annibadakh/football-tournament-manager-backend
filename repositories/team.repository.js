const { Op } = require("sequelize");
const { Position, Team, TeamMember, Tournament, User } = require("../models");
const {
  LIVE_TEAM_STATUSES,
  LOCKING_MEMBER_STATUSES,
  MEMBER_STATUS,
  SLOT_TEAM_STATUSES,
  TEAM_SOURCE,
} = require("../constants/team.constants");

// email is loaded for notifications only; presenters never return it
const PERSON_ATTRIBUTES = ["id", "uuid", "fullName", "email", "photoKey", "accountStatus"];

const MEMBER_INCLUDES = [
  { model: User, as: "user", attributes: PERSON_ATTRIBUTES },
  { model: Position, as: "position", attributes: ["id", "code", "name", "shortName"] },
];

const TEAM_INCLUDES = [
  { model: User, as: "captain", attributes: PERSON_ATTRIBUTES },
  { model: Tournament, as: "tournament" },
];

const createTeam = (data, { transaction } = {}) => Team.create(data, { transaction });

const updateTeam = (team, changes, { transaction } = {}) => team.update(changes, { transaction });

const findTeamByUuid = (uuid, { transaction, lock = false } = {}) =>
  Team.findOne({
    where: { uuid },
    include: TEAM_INCLUDES,
    transaction,
    ...(lock && transaction && { lock: transaction.LOCK.UPDATE }),
  });

const findTeamById = (id, { transaction } = {}) =>
  Team.findByPk(id, { include: TEAM_INCLUDES, transaction });

const findTeamsByTournament = (tournamentId, { statuses }) =>
  Team.findAll({
    where: { tournamentId, ...(statuses && { status: statuses }) },
    include: [{ model: User, as: "captain", attributes: PERSON_ATTRIBUTES }],
    order: [["createdAt", "ASC"]],
  });

// Active squad sizes for many teams in one query (no N+1)
const countActiveMembersByTeam = async (teamIds) => {
  if (!teamIds.length) return {};
  const rows = await TeamMember.findAll({
    attributes: [
      "teamId",
      [TeamMember.sequelize.fn("COUNT", TeamMember.sequelize.col("id")), "count"],
    ],
    where: { teamId: teamIds, status: LOCKING_MEMBER_STATUSES },
    group: ["teamId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((row) => [row.teamId, Number(row.count)]));
};

const countSlotTeams = (tournamentId, { transaction } = {}) =>
  Team.count({ where: { tournamentId, status: SLOT_TEAM_STATUSES }, transaction });

const isTeamNameTaken = async (tournamentId, name, { excludeTeamId, transaction } = {}) =>
  (await Team.count({
    where: {
      tournamentId,
      name,
      status: LIVE_TEAM_STATUSES,
      ...(excludeTeamId && { id: { [Op.ne]: excludeTeamId } }),
    },
    transaction,
  })) > 0;

const countCaptainRequests = (tournamentId, captainUserId, { transaction } = {}) =>
  Team.count({ where: { tournamentId, captainUserId, source: TEAM_SOURCE.REQUEST }, transaction });

const findMembers = (teamId, { statuses, transaction } = {}) =>
  TeamMember.findAll({
    where: { teamId, ...(statuses && { status: statuses }) },
    include: MEMBER_INCLUDES,
    order: [
      ["isCaptain", "DESC"],
      ["jerseyNumber", "ASC"],
    ],
    transaction,
  });

const findMemberByUuid = (teamId, uuid, { transaction } = {}) =>
  TeamMember.findOne({ where: { teamId, uuid }, include: MEMBER_INCLUDES, transaction });

const findMemberById = (id, { transaction } = {}) =>
  TeamMember.findByPk(id, {
    include: [...MEMBER_INCLUDES, { model: Team, as: "team", include: TEAM_INCLUDES }],
    transaction,
  });

const findMembersByIds = (ids) =>
  TeamMember.findAll({
    where: { id: ids },
    include: [...MEMBER_INCLUDES, { model: Team, as: "team", include: TEAM_INCLUDES }],
  });

const createMember = (data, { transaction } = {}) => TeamMember.create(data, { transaction });

const updateMember = (member, changes, { transaction } = {}) =>
  member.update(changes, { transaction });

// Does this user already hold a squad slot (active or invited) in the tournament?
const findLockingMembership = (tournamentId, userId, { transaction } = {}) =>
  TeamMember.findOne({
    where: { tournamentId, userId, status: LOCKING_MEMBER_STATUSES },
    transaction,
  });

const isJerseyTaken = async (teamId, jerseyNumber, { excludeMemberId, transaction } = {}) =>
  (await TeamMember.count({
    where: {
      teamId,
      jerseyNumber,
      status: LOCKING_MEMBER_STATUSES,
      ...(excludeMemberId && { id: { [Op.ne]: excludeMemberId } }),
    },
    transaction,
  })) > 0;

// Memberships of a user across tournaments (my teams)
const findMembershipsByUser = (userId) =>
  TeamMember.findAll({
    where: { userId, status: LOCKING_MEMBER_STATUSES },
    include: [
      { model: Position, as: "position", attributes: ["id", "code", "name", "shortName"] },
      { model: Team, as: "team", where: { status: LIVE_TEAM_STATUSES }, include: TEAM_INCLUDES },
    ],
    order: [["createdAt", "DESC"]],
  });

/**
 * Frees every squad slot of a team that left the tournament: pending invites become CANCELLED,
 * active members REMOVED. Bulk updates set activeLock explicitly (hooks don't run on bulk updates).
 * Returns the ids of cancelled invited members so their invite links can be revoked.
 */
const releaseTeamMembers = async (teamId, { transaction }) => {
  const invited = await TeamMember.findAll({
    where: { teamId, status: MEMBER_STATUS.INVITED },
    attributes: ["id"],
    transaction,
  });
  await TeamMember.update(
    { status: MEMBER_STATUS.CANCELLED, activeLock: null },
    { where: { teamId, status: MEMBER_STATUS.INVITED }, transaction },
  );
  await TeamMember.update(
    { status: MEMBER_STATUS.REMOVED, activeLock: null },
    { where: { teamId, status: MEMBER_STATUS.ACTIVE }, transaction },
  );
  return invited.map((member) => member.id);
};

module.exports = {
  releaseTeamMembers,
  createTeam,
  updateTeam,
  findTeamByUuid,
  findTeamById,
  findTeamsByTournament,
  countActiveMembersByTeam,
  countSlotTeams,
  isTeamNameTaken,
  countCaptainRequests,
  findMembers,
  findMemberByUuid,
  findMemberById,
  findMembersByIds,
  createMember,
  updateMember,
  findLockingMembership,
  isJerseyTaken,
  findMembershipsByUser,
};
