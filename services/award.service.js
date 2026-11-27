const { sequelize } = require("../models");
const matchRepository = require("../repositories/match.repository");
const statsRepository = require("../repositories/stats.repository");
const teamRepository = require("../repositories/team.repository");
const tournamentRepository = require("../repositories/tournament.repository");
const storageService = require("./storage.service");
const {
  canManageTournament,
  findManageableTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const { getStandings } = require("./live.service");
const ApiError = require("../utils/ApiError");
const { individualAwards, teamPlacings } = require("../utils/awards");
const { AWARD_TYPE } = require("../constants/award.constants");
const { MATCH_STAGE } = require("../constants/match.constants");
const { MEMBER_STATUS, TEAM_STATUS } = require("../constants/team.constants");

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

const presentAward = async (award) => ({
  id: award.uuid,
  type: award.type,
  title: award.title,
  value: award.value,
  isAutomatic: award.isAutomatic,
  team: award.team && {
    id: award.team.uuid,
    name: award.team.name,
    shortName: award.team.shortName,
  },
  player: award.player && {
    id: award.player.uuid,
    fullName: award.player.fullName,
    photoUrl: await storageService.getReadUrl(award.player.photoKey),
  },
  tournament: award.tournament && {
    id: award.tournament.uuid,
    slug: award.tournament.slug,
    name: award.tournament.name,
  },
});

const presentAwards = (awards) => Promise.all(awards.map(presentAward));

// Per-player counts [{ userId, teamId, count }] from rows
const countBy = (rows, pickUser, pickTeam) => {
  const counts = new Map();
  rows.forEach((row) => {
    const userId = pickUser(row);
    if (!userId) return;
    const key = `${userId}`;
    const entry = counts.get(key) ?? { userId, teamId: pickTeam(row), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  return [...counts.values()];
};

/**
 * Rebuilds the automatic awards of a completed tournament: placings from the final /
 * table / groups, and Golden Boot, Most assists, Most POTM (ties share). Custom awards stay.
 */
const recalculateAutomaticAwards = async (tournament) => {
  const [knockoutMatches, standings, goalEvents, potmMatches] = await Promise.all([
    matchRepository.findMatches(tournament.id, { stage: MATCH_STAGE.KNOCKOUT }),
    getStandings(null, tournament.uuid),
    statsRepository.findGoalEvents({ tournamentId: tournament.id }),
    statsRepository.findPotmMatches({ tournamentId: tournament.id }),
  ]);
  const teams = await teamRepository.findTeamsByTournament(tournament.id, {
    statuses: [TEAM_STATUS.CONFIRMED],
  });
  const teamIdByUuid = new Map(teams.map((team) => [team.uuid, team.id]));
  const tables = standings.tables.map((table) => ({
    groupName: table.group?.name ?? null,
    rows: table.rows.map((row) => ({ ...row, team: { id: teamIdByUuid.get(row.team.id) } })),
  }));

  // POTM's team: the squad the player belongs to in this tournament
  const potmTeam = new Map();
  for (const match of potmMatches) {
    if (potmTeam.has(match.potmUserId)) continue;
    const membership = await teamRepository.findLockingMembership(tournament.id, match.potmUserId);
    potmTeam.set(match.potmUserId, membership?.teamId ?? null);
  }

  const awards = [
    ...teamPlacings({ format: tournament.tournamentFormat, knockoutMatches, tables }),
    ...individualAwards({
      goals: countBy(
        goalEvents,
        (row) => row.playerUserId,
        (row) => row.teamId,
      ),
      assists: countBy(
        goalEvents,
        (row) => row.assistUserId,
        (row) => row.teamId,
      ),
      potm: countBy(
        potmMatches,
        (row) => row.potmUserId,
        (row) => potmTeam.get(row.potmUserId),
      ),
    }),
  ];
  await sequelize.transaction((transaction) =>
    statsRepository.replaceAutomaticAwards(tournament.id, awards, { transaction }),
  );
  return awards.length;
};

const listAwards = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  return presentAwards(await statsRepository.findAwardsByTournament(tournament.id));
};

// Organizer award for a player (team taken from their squad) or a team
const createCustomAward = async (actor, tournamentId, { title, teamId, playerId }) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  if (!teamId && !playerId) throw fieldError("playerId", "Choose a player or a team");
  let team = null;
  let userId = null;
  if (playerId) {
    const user = await sequelize.models.User.findOne({
      where: { uuid: playerId },
      attributes: ["id"],
    });
    const membership = user && (await teamRepository.findLockingMembership(tournament.id, user.id));
    if (!membership || membership.status !== MEMBER_STATUS.ACTIVE)
      throw fieldError("playerId", "Choose a player from this tournament's squads");
    userId = user.id;
    team = await teamRepository.findTeamById(membership.teamId);
  } else {
    team = await teamRepository.findTeamByUuid(teamId);
    if (!team || team.tournamentId !== tournament.id || team.status !== TEAM_STATUS.CONFIRMED)
      throw fieldError("teamId", "Choose a confirmed team from this tournament");
  }
  const award = await statsRepository.createAward({
    tournamentId: tournament.id,
    type: AWARD_TYPE.CUSTOM,
    title,
    teamId: team.id,
    userId,
    isAutomatic: false,
    createdBy: actor.id,
  });
  const [created] = (await statsRepository.findAwardsByTournament(tournament.id)).filter(
    (item) => item.id === award.id,
  );
  return presentAward(created);
};

// Organizers remove their own awards; automatic ones are rebuilt on completion
const deleteAward = async (actor, awardUuid) => {
  const award = await statsRepository.findAwardByUuid(awardUuid);
  if (!award) throw ApiError.notFound("Award not found");
  const tournament = await tournamentRepository.findTournamentById(award.tournamentId);
  if (!canManageTournament(actor, tournament))
    throw ApiError.forbidden("You can't manage this tournament");
  if (award.isAutomatic)
    throw ApiError.conflict("Automatic awards come from results and can't be removed");
  await award.destroy();
  return null;
};

module.exports = {
  presentAward,
  presentAwards,
  recalculateAutomaticAwards,
  listAwards,
  createCustomAward,
  deleteAward,
};
