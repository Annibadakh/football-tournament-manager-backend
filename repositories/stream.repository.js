const { Match, Stream, Team, Tournament, TournamentStaff } = require("../models");
const { STAFF_ROLE, STAFF_STATUS } = require("../constants/team.constants");
const { STREAM_STATUS } = require("../constants/stream.constants");

const MATCH_INCLUDE = {
  model: Match,
  as: "match",
  attributes: ["id", "uuid", "matchNumber", "roundName", "scheduledAt"],
  include: [
    { model: Team, as: "homeTeam", attributes: ["id", "uuid", "name", "shortName"] },
    { model: Team, as: "awayTeam", attributes: ["id", "uuid", "name", "shortName"] },
  ],
};

const createStream = (data, { transaction } = {}) => Stream.create(data, { transaction });

const updateStream = (stream, changes, { transaction } = {}) =>
  stream.update(changes, { transaction });

const findStreamByUuid = (uuid) => Stream.findOne({ where: { uuid }, include: [MATCH_INCLUDE] });

const findStreamByMatchId = (matchId) => Stream.findOne({ where: { matchId } });

// Live first, then upcoming by time, then replays (newest first) — ordered in the service
const findStreamsByTournament = (tournamentId) =>
  Stream.findAll({
    where: { tournamentId },
    include: [MATCH_INCLUDE],
    order: [
      ["scheduledAt", "ASC"],
      ["id", "ASC"],
    ],
  });

const isActiveMediaOperator = async (tournamentId, userId) =>
  Boolean(
    await TournamentStaff.findOne({
      where: {
        tournamentId,
        userId,
        staffRole: STAFF_ROLE.MEDIA_OPERATOR,
        status: STAFF_STATUS.ACTIVE,
      },
      attributes: ["id"],
    }),
  );

// Tournaments the user streams for, with streaming switched on
const findMediaOperatorTournaments = async (userId) => {
  const staff = await TournamentStaff.findAll({
    where: { userId, staffRole: STAFF_ROLE.MEDIA_OPERATOR, status: STAFF_STATUS.ACTIVE },
    include: [
      {
        model: Tournament,
        as: "tournament",
        where: { isStreamingEnabled: true },
        attributes: ["id", "uuid", "slug", "name", "status", "startDate"],
      },
    ],
  });
  return staff.map((row) => row.tournament);
};

const countLiveStreams = (tournamentId) =>
  Stream.count({ where: { tournamentId, status: STREAM_STATUS.LIVE } });

module.exports = {
  createStream,
  updateStream,
  findStreamByUuid,
  findStreamByMatchId,
  findStreamsByTournament,
  isActiveMediaOperator,
  findMediaOperatorTournaments,
  countLiveStreams,
};
