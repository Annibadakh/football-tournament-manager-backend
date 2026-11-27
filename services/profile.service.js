const statsRepository = require("../repositories/stats.repository");
const teamRepository = require("../repositories/team.repository");
const userRepository = require("../repositories/user.repository");
const matchRepository = require("../repositories/match.repository");
const storageService = require("./storage.service");
const placeService = require("./place.service");
const { presentAwards } = require("./award.service");
const { getStandings } = require("./live.service");
const { assertViewable } = require("./tournamentAccess.service");
const tournamentRepository = require("../repositories/tournament.repository");
const ApiError = require("../utils/ApiError");
const ml = require("../utils/matchLogic");
const { ageFromDateOfBirth } = require("../utils/awards");
const { TEAM_AWARD_TYPES } = require("../constants/award.constants");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");
const { MATCH_STATUS } = require("../constants/match.constants");
const { TEAM_STATUS } = require("../constants/team.constants");

const TOP_TEAM_SCORERS = 5;

const emptyTotals = () => ({
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goals: 0,
  assists: 0,
  potm: 0,
});

const addTotals = (into, from) => {
  Object.keys(into).forEach((key) => {
    into[key] += from[key];
  });
  return into;
};

// W/D/L for a team from its played (completed) matches
const recordFor = (teamId, matches) =>
  matches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .reduce(
      (totals, match) => {
        totals.matches += 1;
        if (!match.winnerTeamId) totals.draws += 1;
        else if (match.winnerTeamId === teamId) totals.wins += 1;
        else totals.losses += 1;
        return totals;
      },
      { matches: 0, wins: 0, draws: 0, losses: 0 },
    );

const presentPositions = (user) =>
  (user.positions ?? [])
    .map((position) => ({
      id: position.id,
      name: position.name,
      shortName: position.shortName,
      isPrimary: position.UserPosition.isPrimary,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

/**
 * Public profile of a verified player: no email, phone or date of birth (age only).
 * Every active squad member counts as playing each completed match of their team.
 */
const getPlayerProfile = async (playerUuid) => {
  const user = await userRepository.findUserByUuidWithPositions(playerUuid);
  if (
    !user ||
    user.accountRole !== ACCOUNT_ROLE.MEMBER ||
    user.accountStatus !== ACCOUNT_STATUS.VERIFIED
  )
    throw ApiError.notFound("Player not found");

  const memberships = await statsRepository.findPlayerMemberships(user.id);
  const teamIds = memberships.map((membership) => membership.team.id);
  const [matches, goalEvents, potmMatches, awards] = await Promise.all([
    statsRepository.findCompletedMatchesForTeams(teamIds),
    statsRepository.findGoalEvents({ playerIds: [user.id] }),
    statsRepository.findPotmMatches({ userId: user.id }),
    statsRepository.findAwardsForPlayer(user.id, teamIds, TEAM_AWARD_TYPES),
  ]);

  const history = memberships.map((membership) => {
    const { team } = membership;
    const stats = {
      ...recordFor(team.id, matches),
      goals: goalEvents.filter((e) => e.playerUserId === user.id && e.teamId === team.id).length,
      assists: goalEvents.filter((e) => e.assistUserId === user.id && e.teamId === team.id).length,
      potm: potmMatches.filter((m) => m.tournamentId === team.tournamentId).length,
    };
    return {
      team: { id: team.uuid, name: team.name, shortName: team.shortName },
      tournament: {
        id: team.tournament.uuid,
        slug: team.tournament.slug,
        name: team.tournament.name,
        status: team.tournament.status,
        startDate: team.tournament.startDate,
      },
      position: membership.position && {
        name: membership.position.name,
        shortName: membership.position.shortName,
      },
      jerseyNumber: membership.jerseyNumber,
      isCaptain: membership.isCaptain,
      stats,
    };
  });

  const visibleTournamentIds = new Set(
    memberships.map((membership) => membership.team.tournamentId),
  );
  return {
    id: user.uuid,
    fullName: user.fullName,
    photoUrl: await storageService.getReadUrl(user.photoKey),
    age: ageFromDateOfBirth(user.dateOfBirth),
    city: placeService.presentPlace(user.city),
    bio: user.bio,
    positions: presentPositions(user),
    totals: history.reduce(
      (totals, row) => addTotals(totals, { ...emptyTotals(), ...row.stats }),
      emptyTotals(),
    ),
    history,
    awards: await presentAwards(
      awards.filter((award) => visibleTournamentIds.has(award.tournamentId)),
    ),
  };
};

// Team card on the team page: record, goals, table position, top scorers, awards
const getTeamStats = async (viewer, teamUuid) => {
  const team = await teamRepository.findTeamByUuid(teamUuid);
  if (!team || team.status !== TEAM_STATUS.CONFIRMED) throw ApiError.notFound("Team not found");
  const tournament = assertViewable(
    viewer,
    await tournamentRepository.findTournamentById(team.tournamentId),
  );

  const matches = await matchRepository.findMatches(tournament.id, { teamId: team.id });
  const record = singleTeamRecord(team.id, matches);

  const [standings, goalEvents, awards, members] = await Promise.all([
    getStandings(viewer, tournament.uuid),
    statsRepository.findGoalEvents({ teamIds: [team.id] }),
    statsRepository.findAwardsForTeam(team.id),
    teamRepository.findMembers(team.id),
  ]);
  const tableEntry = standings.tables
    .map((table) => ({ table, row: table.rows.find((item) => item.team.id === team.uuid) }))
    .find((entry) => entry.row);

  const memberById = new Map(members.map((member) => [member.userId, member.user]));
  const scorerCounts = new Map();
  goalEvents.forEach((event) =>
    scorerCounts.set(event.playerUserId, (scorerCounts.get(event.playerUserId) ?? 0) + 1),
  );
  const topScorers = [...scorerCounts.entries()]
    .filter(([userId]) => memberById.has(userId))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TEAM_SCORERS)
    .map(([userId, goals]) => ({
      player: { id: memberById.get(userId).uuid, fullName: memberById.get(userId).fullName },
      goals,
    }));

  return {
    record,
    table: tableEntry && {
      group: tableEntry.table.group,
      position: tableEntry.row.position,
      teamsInTable: tableEntry.table.rows.length,
      points: tableEntry.row.points,
    },
    topScorers,
    awards: await presentAwards(awards),
  };
};

// P W D L GF GA for one team, including walkovers/forfeits as 3–0
const singleTeamRecord = (teamId, matches) => {
  const record = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
  matches
    .filter((match) =>
      [MATCH_STATUS.COMPLETED, MATCH_STATUS.WALKOVER, MATCH_STATUS.FORFEIT].includes(match.status),
    )
    .forEach((match) => {
      const score = ml.tableScore(match);
      const isHome = match.homeTeamId === teamId;
      record.played += 1;
      record.goalsFor += isHome ? score.home : score.away;
      record.goalsAgainst += isHome ? score.away : score.home;
      if (!match.winnerTeamId) record.drawn += 1;
      else if (match.winnerTeamId === teamId) record.won += 1;
      else record.lost += 1;
    });
  return { ...record, goalDifference: record.goalsFor - record.goalsAgainst };
};

module.exports = { getPlayerProfile, getTeamStats, recordFor };
