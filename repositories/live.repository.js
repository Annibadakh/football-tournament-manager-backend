const { Op } = require("sequelize");
const {
  CardNotice,
  Match,
  Position,
  MatchEvent,
  MatchLog,
  Team,
  TeamMember,
  Tournament,
  TournamentStaff,
  User,
} = require("../models");
const { MEMBER_STATUS, STAFF_ROLE, STAFF_STATUS } = require("../constants/team.constants");
const { MATCH_EVENT_TYPE, MATCH_STATUS } = require("../constants/match.constants");

const PERSON_ATTRIBUTES = ["id", "uuid", "fullName", "photoKey"];

const EVENT_INCLUDES = [
  { model: User, as: "player", attributes: PERSON_ATTRIBUTES },
  { model: User, as: "assist", attributes: PERSON_ATTRIBUTES },
  { model: Team, as: "team", attributes: ["id", "uuid", "name", "shortName"] },
];

const lockOption = (transaction, lock) => lock && transaction && { lock: transaction.LOCK.UPDATE };

// ---------- access ----------

const isActiveScorer = async (tournamentId, userId) =>
  Boolean(
    await TournamentStaff.findOne({
      where: { tournamentId, userId, staffRole: STAFF_ROLE.SCORER, status: STAFF_STATUS.ACTIVE },
      attributes: ["id"],
    }),
  );

const findScorerTournamentIds = async (userId) =>
  (
    await TournamentStaff.findAll({
      where: { userId, staffRole: STAFF_ROLE.SCORER, status: STAFF_STATUS.ACTIVE },
      attributes: ["tournamentId"],
    })
  ).map((staff) => staff.tournamentId);

const findOrganizedTournamentIds = async (userId) =>
  (await Tournament.findAll({ where: { organizerId: userId }, attributes: ["id"] })).map(
    (tournament) => tournament.id,
  );

// ---------- matches ----------

const lockMatch = (id, { transaction }) =>
  Match.findByPk(id, { transaction, ...lockOption(transaction, true) });

const findUpcomingMatches = (tournamentIds, { limit = 30 } = {}) =>
  tournamentIds.length
    ? Match.findAll({
        where: {
          tournamentId: tournamentIds,
          status: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.LIVE],
          homeTeamId: { [Op.ne]: null },
          awayTeamId: { [Op.ne]: null },
        },
        include: [
          { model: Team, as: "homeTeam", attributes: ["id", "uuid", "name", "shortName"] },
          { model: Team, as: "awayTeam", attributes: ["id", "uuid", "name", "shortName"] },
          { model: Tournament, as: "tournament", attributes: ["id", "uuid", "slug", "name"] },
          "ground",
        ],
        order: [
          ["status", "DESC"],
          ["scheduledAt", "ASC"],
          ["matchNumber", "ASC"],
        ],
        limit,
      })
    : [];

// ---------- squads ----------

const findActiveMembers = (teamIds) =>
  TeamMember.findAll({
    where: { teamId: teamIds, status: MEMBER_STATUS.ACTIVE },
    include: [
      { model: User, as: "user", attributes: PERSON_ATTRIBUTES },
      { model: Position, as: "position", attributes: ["id", "shortName"] },
    ],
    order: [
      ["teamId", "ASC"],
      ["jerseyNumber", "ASC"],
    ],
  });

const findActiveMember = (teamId, userId, { transaction } = {}) =>
  TeamMember.findOne({
    where: { teamId, userId, status: MEMBER_STATUS.ACTIVE },
    attributes: ["id", "teamId", "userId"],
    transaction,
  });

// ---------- events ----------

const createEvent = (data, { transaction } = {}) => MatchEvent.create(data, { transaction });

const findMatchEvents = (matchId, { transaction, withReverted = false } = {}) =>
  MatchEvent.findAll({
    where: { matchId, ...(!withReverted && { isReverted: false }) },
    include: EVENT_INCLUDES,
    order: [["id", "ASC"]],
    transaction,
  });

// Last undoable event (period markers are not undone)
const findLastUndoableEvent = (matchId, { transaction } = {}) =>
  MatchEvent.findOne({
    where: { matchId, isReverted: false, type: { [Op.ne]: MATCH_EVENT_TYPE.PERIOD } },
    order: [["id", "DESC"]],
    transaction,
    ...lockOption(transaction, true),
  });

const findLastPlayerYellow = (matchId, playerUserId, { transaction } = {}) =>
  MatchEvent.findOne({
    where: { matchId, playerUserId, type: MATCH_EVENT_TYPE.YELLOW_CARD, isReverted: false },
    order: [["id", "DESC"]],
    transaction,
  });

const revertEvents = (ids, { transaction }) =>
  MatchEvent.update({ isReverted: true }, { where: { id: ids }, transaction });

const countPlayerEvents = (matchId, playerUserId, type, { transaction } = {}) =>
  MatchEvent.count({ where: { matchId, playerUserId, type, isReverted: false }, transaction });

// Yellow cards per player across finished matches of a tournament
const countTournamentYellows = async (tournamentId, playerIds) => {
  if (!playerIds.length) return {};
  const rows = await MatchEvent.findAll({
    where: {
      tournamentId,
      playerUserId: playerIds,
      type: MATCH_EVENT_TYPE.YELLOW_CARD,
      isReverted: false,
    },
    include: [
      { model: Match, as: "match", attributes: [], where: { status: MATCH_STATUS.COMPLETED } },
    ],
    attributes: ["playerUserId"],
    raw: true,
  });
  return rows.reduce((counts, row) => {
    counts[row.playerUserId] = (counts[row.playerUserId] ?? 0) + 1;
    return counts;
  }, {});
};

// Goals / assists per player, from completed and live matches
const findScoringEvents = (tournamentId) =>
  MatchEvent.findAll({
    where: {
      tournamentId,
      isReverted: false,
      type: [MATCH_EVENT_TYPE.GOAL],
    },
    include: [
      {
        model: Match,
        as: "match",
        attributes: [],
        where: { status: [MATCH_STATUS.COMPLETED, MATCH_STATUS.LIVE] },
      },
      ...EVENT_INCLUDES,
    ],
  });

// ---------- logs ----------

const addLog = (matchId, actorUserId, action, payload, { transaction } = {}) =>
  MatchLog.create({ matchId, actorUserId, action, payload }, { transaction });

const findLogs = (matchId, { limit = 50 } = {}) =>
  MatchLog.findAll({
    where: { matchId },
    include: [{ model: User, as: "actor", attributes: ["id", "uuid", "fullName"] }],
    order: [["id", "DESC"]],
    limit,
  });

// ---------- card notices ----------

const createNoticeIfMissing = async (data, { transaction } = {}) => {
  const [notice] = await CardNotice.findOrCreate({
    where: { sourceMatchId: data.sourceMatchId, userId: data.userId, reason: data.reason },
    defaults: data,
    transaction,
  });
  return notice;
};

const NOTICE_INCLUDES = [
  { model: User, as: "player", attributes: PERSON_ATTRIBUTES },
  { model: Team, as: "team", attributes: ["id", "uuid", "name", "shortName"] },
  { model: Match, as: "sourceMatch", attributes: ["id", "uuid", "matchNumber"] },
];

const findNotices = (tournamentId, { teamIds, openOnly = true } = {}) =>
  CardNotice.findAll({
    where: {
      tournamentId,
      ...(teamIds && { teamId: teamIds }),
      ...(openOnly && { handledAt: null }),
    },
    include: NOTICE_INCLUDES,
    order: [["createdAt", "DESC"]],
  });

const findNoticeByUuid = (uuid) =>
  CardNotice.findOne({ where: { uuid }, include: NOTICE_INCLUDES });

module.exports = {
  isActiveScorer,
  findScorerTournamentIds,
  findOrganizedTournamentIds,
  lockMatch,
  findUpcomingMatches,
  findActiveMembers,
  findActiveMember,
  createEvent,
  findMatchEvents,
  findLastUndoableEvent,
  findLastPlayerYellow,
  revertEvents,
  countPlayerEvents,
  countTournamentYellows,
  findScoringEvents,
  addLog,
  findLogs,
  createNoticeIfMissing,
  findNotices,
  findNoticeByUuid,
};
