const { sequelize } = require("../models");
const matchRepository = require("../repositories/match.repository");
const teamRepository = require("../repositories/team.repository");
const tournamentRepository = require("../repositories/tournament.repository");
const {
  canManageTournament,
  findManageableTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const ApiError = require("../utils/ApiError");
const fx = require("../utils/fixtures");
const { TEAM_STATUS } = require("../constants/team.constants");
const { TOURNAMENT_FORMAT, TOURNAMENT_STATUS } = require("../constants/tournament.constants");
const {
  DEFAULT_YELLOW_CARD_NOTICE_THRESHOLD,
  MATCH_SLOT,
  MATCH_STAGE,
  MATCH_STATUS,
  defaultExtraTimeHalfMinutes,
  defaultHalfMinutes,
  knockoutRoundName,
} = require("../constants/match.constants");

const GROUP_FORMATS = [TOURNAMENT_FORMAT.GROUP_LEAGUE, TOURNAMENT_FORMAT.GROUP_KNOCKOUT];
const CLOSED_STATUSES = [TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED];

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// ---------- settings ----------

// Match settings with game-format defaults filled in
const matchSettingsOf = (tournament) => {
  const playersPerSide = tournament.gameFormat?.playersPerSide;
  return {
    halfMinutes: tournament.halfMinutes ?? defaultHalfMinutes(playersPerSide),
    extraTimeHalfMinutes:
      tournament.extraTimeHalfMinutes ?? defaultExtraTimeHalfMinutes(playersPerSide),
    yellowCardNoticeThreshold:
      tournament.yellowCardNoticeThreshold ?? DEFAULT_YELLOW_CARD_NOTICE_THRESHOLD,
  };
};

const durationOf = (tournament) => fx.matchDurationMinutes(matchSettingsOf(tournament).halfMinutes);

// ---------- presenters ----------

const presentTeamRef = (team) =>
  team && { id: team.uuid, name: team.name, shortName: team.shortName };

const presentMatch = (match) => ({
  id: match.uuid,
  matchNumber: match.matchNumber,
  stage: match.stage,
  group: match.group && { id: match.group.uuid, name: match.group.name },
  roundNumber: match.roundNumber,
  roundName: match.roundName,
  isThirdPlace: match.isThirdPlace,
  homeTeam: presentTeamRef(match.homeTeam),
  awayTeam: presentTeamRef(match.awayTeam),
  homePlaceholder: match.homePlaceholder,
  awayPlaceholder: match.awayPlaceholder,
  ground: match.ground && { id: match.ground.uuid, name: match.ground.name },
  scheduledAt: match.scheduledAt,
  status: match.status,
  period: match.period,
  homeScore: match.homeScore,
  awayScore: match.awayScore,
  decidedBy: match.decidedBy,
  winnerTeamId: match.winnerTeam?.uuid ?? null,
  nextMatch: match.nextMatch && {
    id: match.nextMatch.uuid,
    matchNumber: match.nextMatch.matchNumber,
    slot: match.nextMatchSlot,
  },
  version: match.version,
});

const presentGroup = (group) => ({
  id: group.uuid,
  name: group.name,
  teams: group.groupTeams.map((groupTeam) => presentTeamRef(groupTeam.team)),
});

// ---------- helpers ----------

// Only confirmed teams with a locked squad can play
const findEligibleTeams = async (tournamentId) => {
  const teams = await teamRepository.findTeamsByTournament(tournamentId, {
    statuses: [TEAM_STATUS.CONFIRMED],
  });
  return teams.filter((team) => team.isSquadLocked);
};

const assertOpenTournament = (tournament) => {
  if (CLOSED_STATUSES.includes(tournament.status))
    throw ApiError.badRequest("This tournament has ended. Fixtures can't be changed.");
  if (!tournament.tournamentFormat)
    throw fieldError("tournamentFormat", "Choose the tournament format first");
};

const assertNoStartedMatches = async (tournament, { transaction } = {}) => {
  if (await matchRepository.countStartedMatches(tournament.id, { transaction })) {
    throw ApiError.conflict("Matches have already started, so fixtures can't be regenerated");
  }
};

const assertGroupFormat = (tournament) => {
  if (!GROUP_FORMATS.includes(tournament.tournamentFormat))
    throw ApiError.badRequest("This tournament doesn't use groups");
};

// Resolves team uuids to eligible team rows (all must be confirmed + locked)
const resolveEligibleTeams = (uuids, eligible, field) => {
  const byUuid = new Map(eligible.map((team) => [team.uuid, team]));
  return uuids.map((uuid) => {
    const team = byUuid.get(uuid);
    if (!team) throw fieldError(field, "Only confirmed teams with a locked squad can be used");
    return team;
  });
};

const resolveGround = async (tournament, groundUuid, { transaction } = {}) => {
  if (!groundUuid) return null;
  const grounds = await tournamentRepository.findGrounds(tournament.id, { transaction });
  const ground = grounds.find((item) => item.uuid === groundUuid);
  if (!ground) throw fieldError("groundId", "Choose one of this tournament's grounds");
  return ground;
};

// ---------- groups ----------

const getGroups = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const groups = await matchRepository.findGroups(tournament.id);
  const result = {
    groupsCount: tournament.groupsCount,
    qualifiersPerGroup: tournament.qualifiersPerGroup,
    groups: groups.map(presentGroup),
  };
  if (!canManageTournament(viewer, tournament)) return result;
  const placed = new Set(groups.flatMap((group) => group.groupTeams.map((gt) => gt.teamId)));
  const eligible = await findEligibleTeams(tournament.id);
  return {
    ...result,
    eligibleTeams: eligible.map(presentTeamRef),
    unassignedTeams: eligible.filter((team) => !placed.has(team.id)).map(presentTeamRef),
  };
};

const validateGroupSetup = (tournament, groupSizes, qualifiersPerGroup) => {
  if (groupSizes.some((size) => size < 2))
    throw fieldError("groups", "Every group needs at least 2 teams");
  if (tournament.tournamentFormat === TOURNAMENT_FORMAT.GROUP_KNOCKOUT) {
    if (!qualifiersPerGroup)
      throw fieldError("qualifiersPerGroup", "Set how many teams qualify from each group");
    if (qualifiersPerGroup > Math.min(...groupSizes))
      throw fieldError("qualifiersPerGroup", "Qualifiers can't exceed the smallest group size");
    if (qualifiersPerGroup * groupSizes.length < 2)
      throw fieldError("qualifiersPerGroup", "At least 2 teams must reach the knockout stage");
  }
};

const saveGroups = async (tournament, groups, qualifiersPerGroup) => {
  await sequelize.transaction(async (transaction) => {
    if (await matchRepository.countMatches(tournament.id, { transaction })) {
      throw ApiError.conflict("Delete the existing fixtures before changing groups");
    }
    await matchRepository.replaceGroups(tournament.id, groups, { transaction });
    await tournamentRepository.updateTournament(
      tournament,
      {
        groupsCount: groups.length,
        qualifiersPerGroup:
          tournament.tournamentFormat === TOURNAMENT_FORMAT.GROUP_KNOCKOUT
            ? qualifiersPerGroup
            : null,
      },
      { transaction },
    );
  });
};

const drawGroups = async (actor, tournamentId, { groupsCount, qualifiersPerGroup }) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertOpenTournament(tournament);
  assertGroupFormat(tournament);
  const eligible = await findEligibleTeams(tournament.id);
  if (eligible.length < groupsCount * 2)
    throw fieldError(
      "groupsCount",
      `${eligible.length} teams are ready (confirmed + locked); ${groupsCount} groups need at least ${groupsCount * 2}`,
    );
  const drawn = fx.drawGroups(
    eligible.map((team) => team.id),
    groupsCount,
  );
  validateGroupSetup(
    tournament,
    drawn.map((group) => group.length),
    qualifiersPerGroup,
  );
  await saveGroups(
    tournament,
    drawn.map((teamIds, index) => ({ name: fx.groupName(index), teamIds })),
    qualifiersPerGroup,
  );
  return getGroups(actor, tournamentId);
};

const setGroups = async (actor, tournamentId, { qualifiersPerGroup, groups }) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertOpenTournament(tournament);
  assertGroupFormat(tournament);
  const eligible = await findEligibleTeams(tournament.id);
  const allUuids = groups.flatMap((group) => group.teamIds);
  if (new Set(allUuids).size !== allUuids.length)
    throw fieldError("groups", "A team can be in only one group");
  const resolved = groups.map((group) => ({
    name: group.name,
    teamIds: resolveEligibleTeams(group.teamIds, eligible, "groups").map((team) => team.id),
  }));
  validateGroupSetup(
    tournament,
    resolved.map((group) => group.teamIds.length),
    qualifiersPerGroup,
  );
  await saveGroups(tournament, resolved, qualifiersPerGroup);
  return getGroups(actor, tournamentId);
};

// ---------- generation ----------

const slotFields = (side, entry) => ({
  [`${side}TeamId`]: entry?.teamId ?? null,
  [`${side}Placeholder`]: entry?.placeholder ?? null,
  [`${side}Seed`]: entry?.seed ?? null,
});

// Sequential match numbers within the generation transaction
const createMatchFactory = (tournament, actor, transaction) => {
  let number = 0;
  return (data) => {
    number += 1;
    return matchRepository.createMatch(
      {
        tournamentId: tournament.id,
        status: MATCH_STATUS.SCHEDULED,
        matchNumber: number,
        createdBy: actor.id,
        ...data,
      },
      { transaction },
    );
  };
};

const createRoundRobin = async (create, teamIds, { legs, stage, groupId = null }) => {
  const rounds = fx.roundRobin(teamIds, { legs });
  return rounds.map((pairs, index) => ({
    roundNumber: index + 1,
    build: () =>
      Promise.all(
        pairs.map(([home, away]) =>
          create({
            stage,
            groupId,
            roundNumber: index + 1,
            roundName: `Round ${index + 1}`,
            homeTeamId: home,
            awayTeamId: away,
          }),
        ),
      ),
  }));
};

// Round-major order so match numbers follow play order across groups
const createGroupStages = async (create, groupDefs, legs) => {
  const perGroup = await Promise.all(
    groupDefs.map((group) =>
      createRoundRobin(create, group.teamIds, { legs, stage: group.stage, groupId: group.id }),
    ),
  );
  const maxRounds = Math.max(...perGroup.map((rounds) => rounds.length));
  for (let round = 0; round < maxRounds; round += 1) {
    for (const rounds of perGroup) {
      if (!rounds[round]) continue;
      // Sequential inside a round keeps numbering stable
      await rounds[round].build();
    }
  }
  return maxRounds;
};

/**
 * Creates bracket matches from first-round pairs ({ home, away } entries or null for a bye).
 * Byes move the team (or seed placeholder) straight into the next round. Winners are linked
 * through nextMatchId/nextMatchSlot; an optional third-place match takes the semi-final losers.
 */
const createBracket = async (create, firstRound, { startRound, thirdPlace }, transaction) => {
  let teamsInRound = firstRound.length * 2;
  let previous = [];
  for (const pair of firstRound) {
    if (pair.home && pair.away) {
      const match = await create({
        stage: MATCH_STAGE.KNOCKOUT,
        roundNumber: startRound,
        roundName: knockoutRoundName(teamsInRound),
        ...slotFields("home", pair.home),
        ...slotFields("away", pair.away),
      });
      previous.push({ match });
    } else {
      previous.push({ bye: pair.home ?? pair.away });
    }
  }

  let roundNumber = startRound;
  while (previous.length > 1) {
    teamsInRound /= 2;
    roundNumber += 1;
    const isFinal = teamsInRound === 2;
    if (isFinal && thirdPlace && previous.every((entry) => entry.match)) {
      const [semiA, semiB] = previous.map((entry) => entry.match);
      await create({
        stage: MATCH_STAGE.KNOCKOUT,
        roundNumber,
        roundName: "Third place",
        isThirdPlace: true,
        homePlaceholder: `Loser of M${semiA.matchNumber}`,
        awayPlaceholder: `Loser of M${semiB.matchNumber}`,
      });
    }
    const current = [];
    for (let i = 0; i < previous.length; i += 2) {
      const sideEntry = (entry) =>
        entry.bye ?? { placeholder: `Winner of M${entry.match.matchNumber}` };
      const match = await create({
        stage: MATCH_STAGE.KNOCKOUT,
        roundNumber,
        roundName: knockoutRoundName(teamsInRound),
        ...slotFields("home", sideEntry(previous[i])),
        ...slotFields("away", sideEntry(previous[i + 1])),
      });
      for (const [offset, slot] of [
        [0, MATCH_SLOT.HOME],
        [1, MATCH_SLOT.AWAY],
      ]) {
        const feeder = previous[i + offset].match;
        if (feeder) {
          await feeder.update({ nextMatchId: match.id, nextMatchSlot: slot }, { transaction });
        }
      }
      current.push({ match });
    }
    previous = current;
  }
};

const knockoutFirstRound = (entries) => fx.buildBracket(entries)[0];

const assertEnoughTeams = (teams) => {
  if (teams.length < 2)
    throw ApiError.badRequest(
      "At least 2 teams must be confirmed with a locked squad before generating fixtures",
    );
};

// Groups must cover every eligible team
const loadGroupDefs = async (tournament, eligible, stage) => {
  const groups = await matchRepository.findGroups(tournament.id);
  if (!groups.length) throw ApiError.badRequest("Set up the groups first (draw or place teams)");
  const eligibleIds = new Set(eligible.map((team) => team.id));
  const placed = groups.flatMap((group) => group.groupTeams.map((gt) => gt.teamId));
  const missing = eligible.filter((team) => !placed.includes(team.id));
  if (missing.length)
    throw ApiError.badRequest(
      `Place these teams in a group first: ${missing.map((team) => team.name).join(", ")}`,
    );
  const ineligible = placed.filter((id) => !eligibleIds.has(id));
  if (ineligible.length)
    throw ApiError.badRequest(
      "Some grouped teams are no longer confirmed with a locked squad. Update the groups first.",
    );
  return groups.map((group) => ({
    id: group.id,
    stage,
    teamIds: group.groupTeams.map((gt) => gt.teamId),
  }));
};

const generateFixtures = async (actor, tournamentId, { legs, thirdPlace, replace, schedule }) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertOpenTournament(tournament);
  const eligible = await findEligibleTeams(tournament.id);
  assertEnoughTeams(eligible);
  const format = tournament.tournamentFormat;
  const groupDefs = GROUP_FORMATS.includes(format)
    ? await loadGroupDefs(tournament, eligible, MATCH_STAGE.GROUP)
    : null;

  await sequelize.transaction(async (transaction) => {
    await assertNoStartedMatches(tournament, { transaction });
    if (await matchRepository.countMatches(tournament.id, { transaction })) {
      if (!replace)
        throw ApiError.conflict("Fixtures already exist. Confirm to replace them.", [
          { field: "replace", message: "Send replace: true to regenerate" },
        ]);
      await matchRepository.deleteMatches(tournament.id, { transaction });
    }
    const create = createMatchFactory(tournament, actor, transaction);
    const teamIds = fx.shuffle(eligible.map((team) => team.id));

    if (format === TOURNAMENT_FORMAT.LEAGUE) {
      await createGroupStages(create, [{ id: null, stage: MATCH_STAGE.LEAGUE, teamIds }], legs);
    } else if (format === TOURNAMENT_FORMAT.KNOCKOUT) {
      const firstRound = knockoutFirstRound(teamIds.map((teamId) => ({ teamId })));
      await createBracket(create, firstRound, { startRound: 1, thirdPlace }, transaction);
    } else if (format === TOURNAMENT_FORMAT.GROUP_LEAGUE) {
      await createGroupStages(create, groupDefs, legs);
    } else if (format === TOURNAMENT_FORMAT.GROUP_KNOCKOUT) {
      const groupRounds = await createGroupStages(create, groupDefs, legs);
      const seeds = fx.crossoverEntries(groupDefs.length, tournament.qualifiersPerGroup);
      const toEntry = (seed) => ({ seed, placeholder: fx.seedPlaceholder(seed) });
      const total = groupDefs.length * tournament.qualifiersPerGroup;
      const usePairs = seeds.pairs && fx.nextPowerOfTwo(total) === total;
      const firstRound = usePairs
        ? seeds.pairs.map(([home, away]) => ({ home: toEntry(home), away: toEntry(away) }))
        : knockoutFirstRound((seeds.entries ?? seeds.pairs.flat()).map(toEntry));
      await createBracket(
        create,
        firstRound,
        { startRound: groupRounds + 1, thirdPlace },
        transaction,
      );
    }
  });

  if (schedule) await scheduleMatches(actor, tournamentId, schedule);
  return listMatches(actor, tournamentId, {});
};

const deleteFixtures = async (actor, tournamentId) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  await sequelize.transaction(async (transaction) => {
    await assertNoStartedMatches(tournament, { transaction });
    await matchRepository.deleteMatches(tournament.id, { transaction });
  });
  return null;
};

// ---------- scheduling ----------

const scheduleMatches = async (
  actor,
  tournamentId,
  { startDate, firstKickoff, lastKickoff, slotMinutes, groundIds, reschedule = false },
) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertOpenTournament(tournament);
  if (firstKickoff > lastKickoff)
    throw fieldError("lastKickoff", "The last kick-off must be after the first kick-off");
  const grounds = await tournamentRepository.findGrounds(tournament.id);
  const chosen = groundIds?.length
    ? groundIds.map((uuid) => {
        const ground = grounds.find((item) => item.uuid === uuid);
        if (!ground) throw fieldError("groundIds", "Choose this tournament's grounds");
        return ground;
      })
    : grounds;
  if (!chosen.length) throw fieldError("groundIds", "Add at least one ground first");

  const matches = await matchRepository.findMatches(tournament.id, {
    status: MATCH_STATUS.SCHEDULED,
  });
  const toSchedule = matches.filter((match) => reschedule || !match.scheduledAt);
  const pendingIds = new Set(toSchedule.map((match) => match.id));
  const busy = (
    await matchRepository.findScheduledForClashes(
      tournament.id,
      chosen.map((ground) => ground.id),
    )
  ).filter((match) => !pendingIds.has(match.id));

  const { assignments, unscheduledIds } = fx.autoSchedule(
    toSchedule.map((match) => ({
      id: match.id,
      roundKey: `${match.stage}-${match.roundNumber}`,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
    })),
    {
      startDate,
      firstKickoff,
      lastKickoff,
      slotMinutes,
      groundIds: chosen.map((ground) => ground.id),
      busy,
      durationMinutes: durationOf(tournament),
    },
  );

  const byId = new Map(toSchedule.map((match) => [match.id, match]));
  await sequelize.transaction(async (transaction) => {
    for (const assignment of assignments) {
      await matchRepository.updateMatch(
        byId.get(assignment.id),
        { scheduledAt: assignment.scheduledAt, groundId: assignment.groundId },
        { transaction },
      );
    }
  });
  return { scheduledCount: assignments.length, unscheduledCount: unscheduledIds.length };
};

// ---------- single matches ----------

const findMatchForManager = async (actor, matchUuid, options) => {
  const match = await matchRepository.findMatchByUuid(matchUuid, options);
  if (!match) throw ApiError.notFound("Match not found");
  const tournament = await tournamentRepository.findTournamentById(match.tournamentId);
  if (!canManageTournament(actor, tournament))
    throw ApiError.forbidden("You can't manage this match");
  return { match, tournament };
};

const assertNotStarted = (match) => {
  if (match.status !== MATCH_STATUS.SCHEDULED)
    throw ApiError.conflict("Only matches that haven't started can be changed");
};

// Blocking clashes fail the request; same-day warnings are returned to the caller
const checkClashes = async (tournament, candidate) => {
  const others = await matchRepository.findScheduledForClashes(
    tournament.id,
    candidate.groundId ? [candidate.groundId] : [],
  );
  const { errors, warnings } = fx.findClashes(candidate, others, {
    durationMinutes: durationOf(tournament),
  });
  const numberOf = (id) => others.find((match) => match.id === id)?.matchNumber;
  if (errors.length) {
    throw ApiError.conflict(
      "This time clashes with another match",
      errors.map((error) => ({
        field: error.type === "ground" ? "groundId" : "scheduledAt",
        message:
          error.type === "ground"
            ? `The ground is in use by match M${numberOf(error.matchId)} at that time`
            : `A team is already playing match M${numberOf(error.matchId)} at that time`,
      })),
    );
  }
  return warnings.map((warning) => ({
    type: warning.type,
    message: `A team also plays match M${numberOf(warning.matchId)} on the same day`,
  }));
};

const resolveTeams = async (tournament, { homeTeamId, awayTeamId }) => {
  if (homeTeamId && homeTeamId === awayTeamId)
    throw fieldError("awayTeamId", "Choose two different teams");
  const uuids = [homeTeamId, awayTeamId].filter(Boolean);
  if (!uuids.length) return {};
  const eligible = await findEligibleTeams(tournament.id);
  const [home, away] = [homeTeamId, awayTeamId].map((uuid, index) =>
    uuid
      ? resolveEligibleTeams([uuid], eligible, index ? "awayTeamId" : "homeTeamId")[0]
      : undefined,
  );
  return {
    ...(home && { homeTeamId: home.id, homePlaceholder: null }),
    ...(away && { awayTeamId: away.id, awayPlaceholder: null }),
  };
};

const getMatchResponse = async (matchUuid, warnings = []) => ({
  match: presentMatch(await matchRepository.findMatchByUuid(matchUuid)),
  warnings,
});

const addMatch = async (actor, tournamentId, data) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertOpenTournament(tournament);
  if (!data.homeTeamId || !data.awayTeamId) throw fieldError("homeTeamId", "Choose both teams");
  const teams = await resolveTeams(tournament, data);
  const ground = await resolveGround(tournament, data.groundId);
  const groups = data.groupId ? await matchRepository.findGroups(tournament.id) : [];
  const group = data.groupId ? groups.find((item) => item.uuid === data.groupId) : null;
  if (data.groupId && !group) throw fieldError("groupId", "Choose one of this tournament's groups");

  const stage =
    data.stage ??
    (group
      ? MATCH_STAGE.GROUP
      : tournament.tournamentFormat === TOURNAMENT_FORMAT.LEAGUE
        ? MATCH_STAGE.LEAGUE
        : MATCH_STAGE.KNOCKOUT);
  const candidate = {
    id: null,
    groundId: ground?.id ?? null,
    scheduledAt: data.scheduledAt ?? null,
    ...teams,
  };
  const warnings = await checkClashes(tournament, candidate);
  const match = await sequelize.transaction(async (transaction) =>
    matchRepository.createMatch(
      {
        tournamentId: tournament.id,
        stage,
        groupId: group?.id ?? null,
        roundNumber: data.roundNumber ?? 1,
        roundName: data.roundName ?? null,
        matchNumber: (await matchRepository.maxMatchNumber(tournament.id, { transaction })) + 1,
        status: MATCH_STATUS.SCHEDULED,
        groundId: candidate.groundId,
        scheduledAt: candidate.scheduledAt,
        createdBy: actor.id,
        ...teams,
      },
      { transaction },
    ),
  );
  return getMatchResponse(match.uuid, warnings);
};

const updateMatch = async (actor, matchUuid, changes) => {
  const { match, tournament } = await findMatchForManager(actor, matchUuid);
  assertNotStarted(match);
  const teams = await resolveTeams(tournament, changes);
  const merged = {
    homeTeamId: teams.homeTeamId ?? match.homeTeamId,
    awayTeamId: teams.awayTeamId ?? match.awayTeamId,
  };
  if (merged.homeTeamId && merged.homeTeamId === merged.awayTeamId)
    throw fieldError("awayTeamId", "Choose two different teams");
  const ground =
    changes.groundId === undefined ? undefined : await resolveGround(tournament, changes.groundId);
  const update = {
    ...teams,
    ...(ground !== undefined && { groundId: ground?.id ?? null }),
    ...(changes.scheduledAt !== undefined && { scheduledAt: changes.scheduledAt }),
    ...(changes.roundName !== undefined && { roundName: changes.roundName }),
  };
  const warnings = await checkClashes(tournament, {
    id: match.id,
    groundId: update.groundId !== undefined ? update.groundId : match.groundId,
    scheduledAt: update.scheduledAt !== undefined ? update.scheduledAt : match.scheduledAt,
    ...merged,
  });
  await matchRepository.updateMatch(match, update);
  return getMatchResponse(match.uuid, warnings);
};

const deleteMatch = async (actor, matchUuid) => {
  const { match } = await findMatchForManager(actor, matchUuid);
  assertNotStarted(match);
  await matchRepository.deleteMatch(match);
  return null;
};

// ---------- reads ----------

const listMatches = async (viewer, tournamentId, filters) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const resolved = { ...filters };
  if (filters.teamId) {
    const team = await teamRepository.findTeamByUuid(filters.teamId);
    if (!team || team.tournamentId !== tournament.id) return [];
    resolved.teamId = team.id;
  }
  if (filters.groupId) {
    const groups = await matchRepository.findGroups(tournament.id);
    const group = groups.find((item) => item.uuid === filters.groupId);
    if (!group) return [];
    resolved.groupId = group.id;
  }
  if (filters.date) {
    resolved.from = fx.zonedDateTime(filters.date, "00:00");
    resolved.to = new Date(resolved.from.getTime() + 24 * 60 * 60000);
  }
  const matches = await matchRepository.findMatches(tournament.id, resolved);
  return matches.map(presentMatch);
};

// Knockout rounds in order, for the bracket view
const getBracket = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const matches = await matchRepository.findMatches(tournament.id, {
    stage: MATCH_STAGE.KNOCKOUT,
  });
  const rounds = new Map();
  matches.forEach((match) => {
    const key = match.isThirdPlace ? "third" : match.roundNumber;
    if (!rounds.has(key))
      rounds.set(key, { roundNumber: match.roundNumber, name: match.roundName, matches: [] });
    rounds.get(key).matches.push(presentMatch(match));
  });
  const ordered = [...rounds.entries()].filter(([key]) => key !== "third").map(([, r]) => r);
  return { rounds: ordered, thirdPlace: rounds.get("third")?.matches[0] ?? null };
};

module.exports = {
  matchSettingsOf,
  presentMatch,
  getGroups,
  drawGroups,
  setGroups,
  generateFixtures,
  deleteFixtures,
  scheduleMatches,
  addMatch,
  updateMatch,
  deleteMatch,
  listMatches,
  getBracket,
};
