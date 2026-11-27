const { Op } = require("sequelize");
const {
  Award,
  Match,
  MatchEvent,
  Position,
  Team,
  TeamMember,
  Tournament,
  User,
} = require("../models");
const { MATCH_EVENT_TYPE, MATCH_STATUS } = require("../constants/match.constants");
const { MEMBER_STATUS, TEAM_STATUS } = require("../constants/team.constants");
const { PUBLIC_STATUSES } = require("../constants/tournament.constants");

const TEAM_ATTRIBUTES = ["id", "uuid", "name", "shortName"];
const TOURNAMENT_ATTRIBUTES = ["id", "uuid", "slug", "name", "status", "startDate", "endDate"];

// A player's squad places in confirmed teams of public tournaments, newest first
const findPlayerMemberships = (userId) =>
  TeamMember.findAll({
    where: { userId, status: MEMBER_STATUS.ACTIVE },
    include: [
      {
        model: Team,
        as: "team",
        attributes: [...TEAM_ATTRIBUTES, "tournamentId", "status"],
        where: { status: TEAM_STATUS.CONFIRMED },
        include: [
          {
            model: Tournament,
            as: "tournament",
            attributes: TOURNAMENT_ATTRIBUTES,
            where: { status: PUBLIC_STATUSES },
          },
        ],
      },
      { model: Position, as: "position", attributes: ["id", "name", "shortName"] },
    ],
    order: [
      [{ model: Team, as: "team" }, { model: Tournament, as: "tournament" }, "startDate", "DESC"],
    ],
  });

// Played matches (not walkovers) of these teams, for W/D/L
const findCompletedMatchesForTeams = (teamIds) =>
  teamIds.length
    ? Match.findAll({
        where: {
          status: MATCH_STATUS.COMPLETED,
          [Op.or]: [{ homeTeamId: teamIds }, { awayTeamId: teamIds }],
        },
        attributes: [
          "id",
          "homeTeamId",
          "awayTeamId",
          "winnerTeamId",
          "homeScore",
          "awayScore",
          "potmUserId",
          "tournamentId",
        ],
      })
    : [];

// Goal events in completed matches, filtered by players, teams or tournament
const findGoalEvents = ({ playerIds, teamIds, tournamentId }) =>
  MatchEvent.findAll({
    where: {
      type: MATCH_EVENT_TYPE.GOAL,
      isReverted: false,
      ...(tournamentId && { tournamentId }),
      ...(teamIds && { teamId: teamIds }),
      ...(playerIds && { [Op.or]: [{ playerUserId: playerIds }, { assistUserId: playerIds }] }),
    },
    include: [
      { model: Match, as: "match", attributes: [], where: { status: MATCH_STATUS.COMPLETED } },
    ],
    attributes: ["playerUserId", "assistUserId", "teamId", "tournamentId"],
    raw: true,
  });

const findPotmMatches = ({ userId, tournamentId }) =>
  Match.findAll({
    where: {
      status: MATCH_STATUS.COMPLETED,
      potmUserId: userId ?? { [Op.ne]: null },
      ...(tournamentId && { tournamentId }),
    },
    attributes: ["id", "potmUserId", "homeTeamId", "awayTeamId", "tournamentId"],
    raw: true,
  });

// ---------- awards ----------

const AWARD_INCLUDES = [
  { model: Team, as: "team", attributes: TEAM_ATTRIBUTES },
  { model: User, as: "player", attributes: ["id", "uuid", "fullName", "photoKey"] },
  { model: Tournament, as: "tournament", attributes: TOURNAMENT_ATTRIBUTES },
];

const findAwardsByTournament = (tournamentId) =>
  Award.findAll({
    where: { tournamentId },
    include: AWARD_INCLUDES,
    order: [
      ["type", "ASC"],
      ["id", "ASC"],
    ],
  });

const findAwardsForPlayer = (userId, teamIds, teamAwardTypes) =>
  Award.findAll({
    where: {
      [Op.or]: [{ userId }, ...(teamIds.length ? [{ teamId: teamIds, type: teamAwardTypes }] : [])],
    },
    include: AWARD_INCLUDES,
    order: [["createdAt", "DESC"]],
  });

const findAwardsForTeam = (teamId) =>
  Award.findAll({ where: { teamId }, include: AWARD_INCLUDES, order: [["type", "ASC"]] });

const replaceAutomaticAwards = async (tournamentId, awards, { transaction }) => {
  await Award.destroy({ where: { tournamentId, isAutomatic: true }, transaction });
  if (awards.length)
    await Award.bulkCreate(
      awards.map((award) => ({ ...award, tournamentId, isAutomatic: true })),
      { transaction },
    );
};

const createAward = (data) => Award.create(data);
const findAwardByUuid = (uuid) => Award.findOne({ where: { uuid } });

module.exports = {
  findPlayerMemberships,
  findCompletedMatchesForTeams,
  findGoalEvents,
  findPotmMatches,
  findAwardsByTournament,
  findAwardsForPlayer,
  findAwardsForTeam,
  replaceAutomaticAwards,
  createAward,
  findAwardByUuid,
};
