const { Op } = require("sequelize");
const { GroupTeam, Match, Team, TournamentGround, TournamentGroup } = require("../models");
const { MATCH_STATUS } = require("../constants/match.constants");

const TEAM_ATTRIBUTES = ["id", "uuid", "name", "shortName", "status"];

const MATCH_INCLUDES = [
  { model: Team, as: "homeTeam", attributes: TEAM_ATTRIBUTES },
  { model: Team, as: "awayTeam", attributes: TEAM_ATTRIBUTES },
  { model: Team, as: "winnerTeam", attributes: TEAM_ATTRIBUTES },
  { model: TournamentGround, as: "ground", attributes: ["id", "uuid", "name"] },
  { model: TournamentGroup, as: "group", attributes: ["id", "uuid", "name"] },
  { model: Match, as: "nextMatch", attributes: ["id", "uuid", "matchNumber"] },
];

const MATCH_ORDER = [
  ["stage", "ASC"],
  ["roundNumber", "ASC"],
  ["matchNumber", "ASC"],
];

// ---------- groups ----------

const findGroups = (tournamentId, { transaction } = {}) =>
  TournamentGroup.findAll({
    where: { tournamentId },
    include: [
      {
        model: GroupTeam,
        as: "groupTeams",
        include: [{ model: Team, as: "team", attributes: TEAM_ATTRIBUTES }],
      },
    ],
    order: [
      ["sortOrder", "ASC"],
      [{ model: GroupTeam, as: "groupTeams" }, "id", "ASC"],
    ],
    transaction,
  });

// Replaces all groups of a tournament; `groups` = [{ name, teamIds }]
const replaceGroups = async (tournamentId, groups, { transaction }) => {
  await GroupTeam.destroy({ where: { tournamentId }, transaction });
  await TournamentGroup.destroy({ where: { tournamentId }, transaction });
  for (const [index, group] of groups.entries()) {
    const created = await TournamentGroup.create(
      { tournamentId, name: group.name, sortOrder: index },
      { transaction },
    );
    if (group.teamIds.length) {
      await GroupTeam.bulkCreate(
        group.teamIds.map((teamId) => ({ groupId: created.id, teamId, tournamentId })),
        { transaction },
      );
    }
  }
};

// ---------- matches ----------

const countMatches = (tournamentId, { transaction } = {}) =>
  Match.count({ where: { tournamentId }, transaction });

const countStartedMatches = (tournamentId, { transaction } = {}) =>
  Match.count({
    where: { tournamentId, status: { [Op.ne]: MATCH_STATUS.SCHEDULED } },
    transaction,
  });

const deleteMatches = async (tournamentId, { transaction }) => {
  // Clear self-references first so rows can go in any order
  await Match.update({ nextMatchId: null }, { where: { tournamentId }, transaction });
  await Match.destroy({ where: { tournamentId }, transaction });
};

const createMatch = (data, { transaction } = {}) => Match.create(data, { transaction });

const updateMatch = (match, changes, { transaction } = {}) =>
  match.update({ ...changes, version: match.version + 1 }, { transaction });

const deleteMatch = async (match, { transaction } = {}) => {
  await Match.update(
    { nextMatchId: null, nextMatchSlot: null },
    { where: { nextMatchId: match.id }, transaction },
  );
  await match.destroy({ transaction });
};

const maxMatchNumber = async (tournamentId, { transaction } = {}) =>
  (await Match.max("matchNumber", { where: { tournamentId }, transaction })) ?? 0;

const findMatchByUuid = (uuid, { transaction, lock = false } = {}) =>
  Match.findOne({
    where: { uuid },
    include: MATCH_INCLUDES,
    transaction,
    ...(lock && transaction && { lock: transaction.LOCK.UPDATE }),
  });

const findMatches = (tournamentId, filters = {}, { transaction } = {}) => {
  const where = { tournamentId };
  if (filters.stage) where.stage = filters.stage;
  if (filters.groupId) where.groupId = filters.groupId;
  if (filters.roundNumber) where.roundNumber = filters.roundNumber;
  if (filters.status) where.status = filters.status;
  if (filters.teamId)
    where[Op.or] = [{ homeTeamId: filters.teamId }, { awayTeamId: filters.teamId }];
  if (filters.from || filters.to) {
    where.scheduledAt = {
      ...(filters.from && { [Op.gte]: filters.from }),
      ...(filters.to && { [Op.lt]: filters.to }),
    };
  }
  return Match.findAll({ where, include: MATCH_INCLUDES, order: MATCH_ORDER, transaction });
};

// Light rows for clash checks: scheduled matches of this tournament or on its grounds
const findScheduledForClashes = (tournamentId, groundIds, { transaction } = {}) =>
  Match.findAll({
    where: {
      scheduledAt: { [Op.ne]: null },
      status: { [Op.ne]: MATCH_STATUS.CANCELLED },
      [Op.or]: [{ tournamentId }, ...(groundIds.length ? [{ groundId: groundIds }] : [])],
    },
    attributes: [
      "id",
      "uuid",
      "matchNumber",
      "groundId",
      "homeTeamId",
      "awayTeamId",
      "scheduledAt",
    ],
    transaction,
  });

module.exports = {
  findGroups,
  replaceGroups,
  countMatches,
  countStartedMatches,
  deleteMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  maxMatchNumber,
  findMatchByUuid,
  findMatches,
  findScheduledForClashes,
};
