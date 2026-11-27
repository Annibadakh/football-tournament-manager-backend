const { sequelize } = require("../models");
const liveRepository = require("../repositories/live.repository");
const matchRepository = require("../repositories/match.repository");
const tournamentRepository = require("../repositories/tournament.repository");
const storageService = require("./storage.service");
const streamService = require("./stream.service");
const {
  assertViewable,
  canManageTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const { matchSettingsOf, presentMatch } = require("./fixture.service");
const ApiError = require("../utils/ApiError");
const ml = require("../utils/matchLogic");
const { TOURNAMENT_FORMAT, TOURNAMENT_STATUS } = require("../constants/tournament.constants");
const {
  CARD_NOTICE_REASON,
  DECIDED_BY,
  FIXTURE_RULES,
  MATCH_EVENT_TYPE,
  MATCH_LOG_ACTION,
  MATCH_PERIOD,
  MATCH_SLOT,
  MATCH_STAGE,
  MATCH_STATUS,
  PERIOD_TRANSITIONS,
} = require("../constants/match.constants");

const DONE_STATUSES = [
  MATCH_STATUS.COMPLETED,
  MATCH_STATUS.WALKOVER,
  MATCH_STATUS.FORFEIT,
  MATCH_STATUS.CANCELLED,
];
const LEADERS_LIMIT = 10;
const CONSOLE_LOG_LIMIT = 30;

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// ---------- presenters ----------

const presentPerson = (user) => user && { id: user.uuid, fullName: user.fullName };

const presentEvent = (event) => ({
  id: event.uuid,
  type: event.type,
  team: event.team && {
    id: event.team.uuid,
    name: event.team.name,
    shortName: event.team.shortName,
  },
  player: presentPerson(event.player),
  assist: presentPerson(event.assist),
  minute: event.minute,
  period: event.period,
  isSecondYellow: event.isSecondYellow,
  createdAt: event.createdAt,
});

const presentNotice = (notice) => ({
  id: notice.uuid,
  reason: notice.reason,
  yellowCount: notice.yellowCount,
  player: presentPerson(notice.player),
  team: notice.team && { id: notice.team.uuid, name: notice.team.name },
  sourceMatch: notice.sourceMatch && {
    id: notice.sourceMatch.uuid,
    matchNumber: notice.sourceMatch.matchNumber,
  },
  handledAt: notice.handledAt,
  createdAt: notice.createdAt,
});

// ---------- access ----------

const canScore = async (user, tournament) =>
  Boolean(user) &&
  (canManageTournament(user, tournament) ||
    (await liveRepository.isActiveScorer(tournament.id, user.id)));

const loadMatch = async (matchUuid) => {
  const match = await matchRepository.findMatchByUuid(matchUuid);
  if (!match) throw ApiError.notFound("Match not found");
  const tournament = await tournamentRepository.findTournamentById(match.tournamentId);
  return { match, tournament };
};

const loadForScorer = async (actor, matchUuid) => {
  const loaded = await loadMatch(matchUuid);
  if (!(await canScore(actor, loaded.tournament)))
    throw ApiError.forbidden("Only the organizer and the tournament's scorers can score matches");
  return loaded;
};

const loadForManager = async (actor, matchUuid) => {
  const loaded = await loadMatch(matchUuid);
  if (!canManageTournament(actor, loaded.tournament))
    throw ApiError.forbidden("Only the organizer can do this");
  return loaded;
};

const assertLive = (match) => {
  if (match.status !== MATCH_STATUS.LIVE)
    throw ApiError.conflict("Scores can only change while the match is live");
};

// ---------- shared state ----------

const liveState = async (match, tournament) => {
  const events = await liveRepository.findMatchEvents(match.id);
  const settings = matchSettingsOf(tournament);
  return {
    id: match.uuid,
    status: match.status,
    period: match.period,
    periodStartedAt: match.periodStartedAt,
    minute: ml.currentMinute(match.period, match.periodStartedAt, settings),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    decidedBy: match.decidedBy,
    winnerTeamId: match.winnerTeam?.uuid ?? null,
    version: match.version,
    serverTime: new Date(),
    events: events.map(presentEvent),
  };
};

const refreshed = (matchUuid) => matchRepository.findMatchByUuid(matchUuid);

const bump = (match, changes, { transaction }) =>
  matchRepository.updateMatch(match, changes, { transaction });

const recomputeScore = async (match, { transaction }) => {
  const events = await liveRepository.findMatchEvents(match.id, { transaction });
  const score = ml.scoreFromEvents(events, match.homeTeamId, match.awayTeamId);
  return { homeScore: score.home, awayScore: score.away };
};

// ---------- clock ----------

const changePeriod = async (actor, matchUuid, { period }) => {
  const { match, tournament } = await loadForScorer(actor, matchUuid);
  if (DONE_STATUSES.includes(match.status)) throw ApiError.conflict("This match is already over");
  if (!PERIOD_TRANSITIONS[match.period].includes(period))
    throw fieldError("period", "That step isn't possible from the current period");
  const isStart = match.period === MATCH_PERIOD.NOT_STARTED;
  if (isStart) {
    if (tournament.status !== TOURNAMENT_STATUS.ONGOING)
      throw ApiError.conflict("Start the tournament before starting matches");
    if (!match.homeTeamId || !match.awayTeamId)
      throw ApiError.conflict("Both teams must be known before kick-off");
  }
  if (period === MATCH_PERIOD.EXTRA_FIRST_HALF && match.stage !== MATCH_STAGE.KNOCKOUT)
    throw fieldError("period", "Extra time is only played in knockout matches");

  const settings = matchSettingsOf(tournament);
  await sequelize.transaction(async (transaction) => {
    const now = new Date();
    await liveRepository.createEvent(
      {
        matchId: match.id,
        tournamentId: match.tournamentId,
        type: MATCH_EVENT_TYPE.PERIOD,
        period,
        minute: ml.periodBaseMinute(period, settings),
        createdBy: actor.id,
      },
      { transaction },
    );
    await bump(
      match,
      {
        period,
        periodStartedAt: now,
        ...(isStart && { status: MATCH_STATUS.LIVE, startedAt: now, homeScore: 0, awayScore: 0 }),
      },
      { transaction },
    );
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.PERIOD,
      { period },
      { transaction },
    );
  });
  return liveState(await refreshed(matchUuid), tournament);
};

// ---------- events ----------

// Active squad members of both teams, keyed by user uuid
const loadSquads = async (match) => {
  const members = await liveRepository.findActiveMembers([match.homeTeamId, match.awayTeamId]);
  return new Map(members.map((member) => [member.user.uuid, member]));
};

const addEvent = async (actor, matchUuid, { type, teamId, playerId, assistId, minute }) => {
  const { match, tournament } = await loadForScorer(actor, matchUuid);
  assertLive(match);
  const side =
    match.homeTeam?.uuid === teamId ? "home" : match.awayTeam?.uuid === teamId ? "away" : null;
  if (!side) throw fieldError("teamId", "Choose one of the two teams");
  const team = match[`${side}Team`];
  const squads = await loadSquads(match);
  const player = squads.get(playerId);
  if (!player || player.teamId !== team.id)
    throw fieldError("playerId", `Choose a player from ${team.name}'s squad`);
  let assist = null;
  if (assistId) {
    if (type !== MATCH_EVENT_TYPE.GOAL) throw fieldError("assistId", "Only goals have an assist");
    assist = squads.get(assistId);
    if (!assist || assist.teamId !== team.id || assistId === playerId)
      throw fieldError("assistId", "Choose a teammate for the assist");
  }

  const settings = matchSettingsOf(tournament);
  const eventMinute = minute ?? ml.currentMinute(match.period, match.periodStartedAt, settings);
  const created = await sequelize.transaction(async (transaction) => {
    const locked = await liveRepository.lockMatch(match.id, { transaction });
    assertLive(locked);
    const base = {
      matchId: match.id,
      tournamentId: match.tournamentId,
      teamId: team.id,
      playerUserId: player.userId,
      minute: eventMinute,
      period: locked.period,
      createdBy: actor.id,
    };
    const isCard = [MATCH_EVENT_TYPE.YELLOW_CARD, MATCH_EVENT_TYPE.RED_CARD].includes(type);
    if (isCard) {
      const reds = await liveRepository.countPlayerEvents(
        match.id,
        player.userId,
        MATCH_EVENT_TYPE.RED_CARD,
        { transaction },
      );
      if (reds) throw fieldError("playerId", "This player has already been sent off");
    }
    const events = [
      await liveRepository.createEvent(
        { ...base, type, assistUserId: assist?.userId ?? null },
        { transaction },
      ),
    ];
    if (type === MATCH_EVENT_TYPE.YELLOW_CARD) {
      const yellows = await liveRepository.countPlayerEvents(
        match.id,
        player.userId,
        MATCH_EVENT_TYPE.YELLOW_CARD,
        { transaction },
      );
      // A second yellow in the same match is a red
      if (yellows >= 2) {
        events.push(
          await liveRepository.createEvent(
            { ...base, type: MATCH_EVENT_TYPE.RED_CARD, isSecondYellow: true },
            { transaction },
          ),
        );
      }
    }
    await bump(match, await recomputeScore(match, { transaction }), { transaction });
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.EVENT_ADDED,
      {
        eventIds: events.map((event) => event.uuid),
        type,
        team: team.name,
        player: player.user.fullName,
        assist: assist?.user.fullName ?? null,
        minute: eventMinute,
      },
      { transaction },
    );
    return events;
  });
  return {
    secondYellowRed: created.length > 1,
    ...(await liveState(await refreshed(matchUuid), tournament)),
  };
};

const undoLastEvent = async (actor, matchUuid) => {
  const { match, tournament } = await loadForScorer(actor, matchUuid);
  assertLive(match);
  await sequelize.transaction(async (transaction) => {
    const last = await liveRepository.findLastUndoableEvent(match.id, { transaction });
    if (!last) throw ApiError.conflict("There is nothing to undo");
    const ids = [last.id];
    // Undoing an automatic red also removes the second yellow that caused it
    if (last.isSecondYellow) {
      const yellow = await liveRepository.findLastPlayerYellow(match.id, last.playerUserId, {
        transaction,
      });
      if (yellow) ids.push(yellow.id);
    }
    await liveRepository.revertEvents(ids, { transaction });
    await bump(match, await recomputeScore(match, { transaction }), { transaction });
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.EVENT_UNDONE,
      { eventId: last.uuid, type: last.type, count: ids.length },
      { transaction },
    );
  });
  return liveState(await refreshed(matchUuid), tournament);
};

// ---------- advancement ----------

const placeTeam = async (nextMatchId, slot, teamId, { transaction }) => {
  const next = await liveRepository.lockMatch(nextMatchId, { transaction });
  if (!next || next.status !== MATCH_STATUS.SCHEDULED) return;
  const side = slot === MATCH_SLOT.HOME ? "home" : "away";
  await bump(next, { [`${side}TeamId`]: teamId }, { transaction });
};

// Winner into the next round; semi-final loser into the third-place match
const advanceKnockout = async (match, winnerTeamId, { transaction }) => {
  if (match.stage !== MATCH_STAGE.KNOCKOUT || !winnerTeamId) return;
  if (match.nextMatchId)
    await placeTeam(match.nextMatchId, match.nextMatchSlot, winnerTeamId, { transaction });
  const loserTeamId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  const loserLabel = `Loser of M${match.matchNumber}`;
  const knockout = await matchRepository.findMatches(
    match.tournamentId,
    { stage: MATCH_STAGE.KNOCKOUT },
    { transaction },
  );
  const third = knockout.find(
    (item) =>
      item.isThirdPlace && [item.homePlaceholder, item.awayPlaceholder].includes(loserLabel),
  );
  if (third) {
    await placeTeam(
      third.id,
      third.homePlaceholder === loserLabel ? MATCH_SLOT.HOME : MATCH_SLOT.AWAY,
      loserTeamId,
      { transaction },
    );
  }
};

// Group tables, keyed by group name, from group-stage matches
const groupTables = async (tournament, { transaction } = {}) => {
  const groups = await matchRepository.findGroups(tournament.id, { transaction });
  const matches = await matchRepository.findMatches(
    tournament.id,
    { stage: MATCH_STAGE.GROUP },
    { transaction },
  );
  const points = {
    win: tournament.pointsWin,
    draw: tournament.pointsDraw,
    loss: tournament.pointsLoss,
  };
  return {
    matches,
    tables: groups.map((group) => ({
      group,
      rows: ml.computeStandings(
        group.groupTeams.map((groupTeam) => groupTeam.team),
        matches.filter((match) => match.groupId === group.id),
        points,
      ),
    })),
  };
};

// When every group match is over, "A1"/"B2" seeds in the bracket become real teams
const fillKnockoutFromGroups = async (tournament, { transaction }) => {
  if (tournament.tournamentFormat !== TOURNAMENT_FORMAT.GROUP_KNOCKOUT) return;
  const { matches, tables } = await groupTables(tournament, { transaction });
  if (!matches.length || matches.some((match) => !DONE_STATUSES.includes(match.status))) return;
  const seeds = {};
  tables.forEach(({ group, rows }) =>
    rows.forEach((row) => {
      seeds[`${group.name}${row.position}`] = row.team.id;
    }),
  );
  const knockout = await matchRepository.findMatches(
    tournament.id,
    { stage: MATCH_STAGE.KNOCKOUT },
    { transaction },
  );
  for (const match of knockout) {
    const changes = {};
    if (match.homeSeed && !match.homeTeamId && seeds[match.homeSeed])
      changes.homeTeamId = seeds[match.homeSeed];
    if (match.awaySeed && !match.awayTeamId && seeds[match.awaySeed])
      changes.awayTeamId = seeds[match.awaySeed];
    if (Object.keys(changes).length && match.status === MATCH_STATUS.SCHEDULED) {
      await bump(match, changes, { transaction });
    }
  }
};

// ---------- results ----------

// Red cards and yellow thresholds from a finished match become notices for the next match
const createCardNotices = async (match, tournament) => {
  const events = await liveRepository.findMatchEvents(match.id);
  const reds = events.filter((event) => event.type === MATCH_EVENT_TYPE.RED_CARD);
  for (const red of reds) {
    await liveRepository.createNoticeIfMissing({
      tournamentId: tournament.id,
      teamId: red.teamId,
      userId: red.playerUserId,
      reason: CARD_NOTICE_REASON.RED_CARD,
      sourceMatchId: match.id,
    });
  }
  const yellowPlayers = [
    ...new Map(
      events
        .filter((event) => event.type === MATCH_EVENT_TYPE.YELLOW_CARD)
        .map((event) => [event.playerUserId, event]),
    ).values(),
  ];
  const totals = await liveRepository.countTournamentYellows(
    tournament.id,
    yellowPlayers.map((event) => event.playerUserId),
  );
  const threshold = matchSettingsOf(tournament).yellowCardNoticeThreshold;
  const thisMatch = events.reduce((counts, event) => {
    if (event.type === MATCH_EVENT_TYPE.YELLOW_CARD)
      counts[event.playerUserId] = (counts[event.playerUserId] ?? 0) + 1;
    return counts;
  }, {});
  for (const event of yellowPlayers) {
    const total = totals[event.playerUserId] ?? 0;
    const before = total - thisMatch[event.playerUserId];
    // Notice each time the running total crosses a multiple of the threshold
    if (Math.floor(total / threshold) > Math.floor(before / threshold)) {
      await liveRepository.createNoticeIfMissing({
        tournamentId: tournament.id,
        teamId: event.teamId,
        userId: event.playerUserId,
        reason: CARD_NOTICE_REASON.YELLOW_CARDS,
        yellowCount: total,
        sourceMatchId: match.id,
      });
    }
  }
};

const declareResult = async (actor, matchUuid, { decidedBy, winnerTeamId, potmPlayerId }) => {
  const { match, tournament } = await loadForScorer(actor, matchUuid);
  assertLive(match);
  if (![MATCH_PERIOD.FULL_TIME, MATCH_PERIOD.FINISHED].includes(match.period))
    throw ApiError.conflict("Blow the final whistle (full time) before declaring the result");
  const winnerSide =
    winnerTeamId === match.homeTeam.uuid
      ? "home"
      : winnerTeamId === match.awayTeam.uuid
        ? "away"
        : null;
  if (winnerTeamId && !winnerSide) throw fieldError("winnerTeamId", "Choose one of the two teams");
  const result = ml.resolveResult({
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    isKnockout: match.stage === MATCH_STAGE.KNOCKOUT,
    playedExtraTime: match.period === MATCH_PERIOD.FINISHED,
    decidedBy,
    winnerSide,
  });
  if (result.error) throw fieldError("decidedBy", result.error);
  let potm = null;
  if (potmPlayerId) {
    potm = (await loadSquads(match)).get(potmPlayerId);
    if (!potm) throw fieldError("potmPlayerId", "Choose a player from either squad");
  }
  const winnerId = result.winnerSide ? match[`${result.winnerSide}TeamId`] : null;

  await sequelize.transaction(async (transaction) => {
    const locked = await liveRepository.lockMatch(match.id, { transaction });
    assertLive(locked);
    await bump(
      locked,
      {
        status: MATCH_STATUS.COMPLETED,
        period: MATCH_PERIOD.FINISHED,
        decidedBy: result.decidedBy,
        winnerTeamId: winnerId,
        potmUserId: potm?.userId ?? null,
        endedAt: new Date(),
        declaredBy: actor.id,
      },
      { transaction },
    );
    await advanceKnockout(match, winnerId, { transaction });
    await fillKnockoutFromGroups(tournament, { transaction });
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.RESULT_DECLARED,
      {
        score: `${match.homeScore}-${match.awayScore}`,
        decidedBy: result.decidedBy,
        winner: winnerId ? match[`${result.winnerSide}Team`].name : null,
        potm: potm?.user.fullName ?? null,
      },
      { transaction },
    );
  });
  await createCardNotices(match, tournament);
  return getMatchDetail(actor, matchUuid);
};

const awardMatch = async (actor, matchUuid, { type, winnerTeamId }) => {
  const { match, tournament } = await loadForManager(actor, matchUuid);
  if (![MATCH_STATUS.SCHEDULED, MATCH_STATUS.LIVE].includes(match.status))
    throw ApiError.conflict("This match is already over");
  if (!match.homeTeamId || !match.awayTeamId)
    throw ApiError.conflict("Both teams must be known first");
  const side =
    winnerTeamId === match.homeTeam.uuid
      ? "home"
      : winnerTeamId === match.awayTeam.uuid
        ? "away"
        : null;
  if (!side) throw fieldError("winnerTeamId", "Choose the team that is awarded the match");
  const winnerId = match[`${side}TeamId`];
  const status = type === "forfeit" ? MATCH_STATUS.FORFEIT : MATCH_STATUS.WALKOVER;

  await sequelize.transaction(async (transaction) => {
    await bump(
      match,
      {
        status,
        period: MATCH_PERIOD.FINISHED,
        homeScore: side === "home" ? FIXTURE_RULES.AWARDED_GOALS : 0,
        awayScore: side === "away" ? FIXTURE_RULES.AWARDED_GOALS : 0,
        winnerTeamId: winnerId,
        decidedBy: DECIDED_BY.REGULAR,
        endedAt: new Date(),
        declaredBy: actor.id,
      },
      { transaction },
    );
    await advanceKnockout(match, winnerId, { transaction });
    await fillKnockoutFromGroups(tournament, { transaction });
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.WALKOVER,
      { type, winner: match[`${side}Team`].name },
      { transaction },
    );
  });
  return getMatchDetail(actor, matchUuid);
};

const cancelMatch = async (actor, matchUuid) => {
  const { match, tournament } = await loadForManager(actor, matchUuid);
  if (![MATCH_STATUS.SCHEDULED, MATCH_STATUS.LIVE].includes(match.status))
    throw ApiError.conflict("This match is already over");
  await sequelize.transaction(async (transaction) => {
    await bump(match, { status: MATCH_STATUS.CANCELLED, endedAt: new Date() }, { transaction });
    await fillKnockoutFromGroups(tournament, { transaction });
    await liveRepository.addLog(
      match.id,
      actor.id,
      MATCH_LOG_ACTION.CANCELLED,
      {},
      { transaction },
    );
  });
  return getMatchDetail(actor, matchUuid);
};

// ---------- reads ----------

const getMatchDetail = async (viewer, matchUuid) => {
  const { match, tournament } = await loadMatch(matchUuid);
  assertViewable(viewer, tournament);
  const [state, potm, stream] = await Promise.all([
    liveState(match, tournament),
    match.potmUserId ? sequelize.models.User.findByPk(match.potmUserId) : null,
    streamService.getMatchStream(match, tournament),
  ]);
  return {
    ...presentMatch(match),
    ...state,
    potm: potm && {
      id: potm.uuid,
      fullName: potm.fullName,
      photoUrl: await storageService.getReadUrl(potm.photoKey),
    },
    tournament: {
      id: tournament.uuid,
      slug: tournament.slug,
      name: tournament.name,
      status: tournament.status,
    },
    settings: matchSettingsOf(tournament),
    stream,
    canScore: await canScore(viewer, tournament),
  };
};

// Light poll: unchanged since `since` → just the version
const getLive = async (viewer, matchUuid, { since }) => {
  const { match, tournament } = await loadMatch(matchUuid);
  assertViewable(viewer, tournament);
  if (since && since === match.version)
    return { id: match.uuid, version: match.version, unchanged: true };
  return liveState(match, tournament);
};

const presentMember = (member, noticesByUser) => ({
  id: member.user.uuid,
  fullName: member.user.fullName,
  jerseyNumber: member.jerseyNumber,
  position: member.position?.shortName ?? null,
  isCaptain: member.isCaptain,
  notices: (noticesByUser.get(member.userId) ?? []).map(presentNotice),
});

const getConsole = async (actor, matchUuid) => {
  const { match, tournament } = await loadForScorer(actor, matchUuid);
  const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean);
  const [members, notices, logs, detail] = await Promise.all([
    teamIds.length ? liveRepository.findActiveMembers(teamIds) : [],
    teamIds.length ? liveRepository.findNotices(tournament.id, { teamIds }) : [],
    liveRepository.findLogs(match.id, { limit: CONSOLE_LOG_LIMIT }),
    getMatchDetail(actor, matchUuid),
  ]);
  // Notices from this match itself aren't "before the next match" yet
  const noticesByUser = new Map();
  notices
    .filter((notice) => notice.sourceMatchId !== match.id)
    .forEach((notice) => {
      if (!noticesByUser.has(notice.userId)) noticesByUser.set(notice.userId, []);
      noticesByUser.get(notice.userId).push(notice);
    });
  const squadOf = (teamId) =>
    members
      .filter((member) => member.teamId === teamId)
      .map((member) => presentMember(member, noticesByUser));
  return {
    match: detail,
    squads: {
      home: match.homeTeamId ? squadOf(match.homeTeamId) : [],
      away: match.awayTeamId ? squadOf(match.awayTeamId) : [],
    },
    logs: logs.map((log) => ({
      id: String(log.id),
      action: log.action,
      payload: log.payload,
      actor: log.actor && { id: log.actor.uuid, fullName: log.actor.fullName },
      createdAt: log.createdAt,
    })),
    canManage: canManageTournament(actor, tournament),
  };
};

const presentRow = (row) => ({
  position: row.position,
  team: { id: row.team.uuid, name: row.team.name, shortName: row.team.shortName },
  played: row.played,
  won: row.won,
  drawn: row.drawn,
  lost: row.lost,
  goalsFor: row.goalsFor,
  goalsAgainst: row.goalsAgainst,
  goalDifference: row.goalDifference,
  points: row.points,
  form: row.form,
});

const getStandings = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const points = {
    win: tournament.pointsWin,
    draw: tournament.pointsDraw,
    loss: tournament.pointsLoss,
  };
  if (tournament.tournamentFormat === TOURNAMENT_FORMAT.LEAGUE) {
    const matches = await matchRepository.findMatches(tournament.id, { stage: MATCH_STAGE.LEAGUE });
    const teamMap = new Map();
    matches.forEach((match) =>
      [match.homeTeam, match.awayTeam].forEach((team) => team && teamMap.set(team.id, team)),
    );
    return {
      tables: [
        {
          group: null,
          qualifiers: null,
          rows: ml.computeStandings([...teamMap.values()], matches, points).map(presentRow),
        },
      ],
    };
  }
  if (
    [TOURNAMENT_FORMAT.GROUP_LEAGUE, TOURNAMENT_FORMAT.GROUP_KNOCKOUT].includes(
      tournament.tournamentFormat,
    )
  ) {
    const { tables } = await groupTables(tournament);
    return {
      tables: tables.map(({ group, rows }) => ({
        group: { id: group.uuid, name: group.name },
        qualifiers: tournament.qualifiersPerGroup,
        rows: rows.map(presentRow),
      })),
    };
  }
  return { tables: [] };
};

const getLeaders = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const goals = await liveRepository.findScoringEvents(tournament.id);
  const tally = (pick) => {
    const counts = new Map();
    goals.forEach((event) => {
      const person = pick(event);
      if (!person) return;
      const entry = counts.get(person.id) ?? {
        player: presentPerson(person),
        team: event.team,
        count: 0,
      };
      entry.count += 1;
      counts.set(person.id, entry);
    });
    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.player.fullName.localeCompare(b.player.fullName))
      .slice(0, LEADERS_LIMIT)
      .map((entry) => ({
        player: entry.player,
        team: { id: entry.team.uuid, name: entry.team.name, shortName: entry.team.shortName },
        count: entry.count,
      }));
  };
  return { scorers: tally((event) => event.player), assists: tally((event) => event.assist) };
};

const listCardNotices = async (actor, tournamentId, { all }) => {
  const tournament = await findViewableTournament(actor, tournamentId);
  if (!(await canScore(actor, tournament)))
    throw ApiError.forbidden("Only the organizer and scorers see card notices");
  const notices = await liveRepository.findNotices(tournament.id, { openOnly: !all });
  return notices.map(presentNotice);
};

const handleCardNotice = async (actor, noticeUuid) => {
  const notice = await liveRepository.findNoticeByUuid(noticeUuid);
  if (!notice) throw ApiError.notFound("Notice not found");
  const tournament = await tournamentRepository.findTournamentById(notice.tournamentId);
  if (!canManageTournament(actor, tournament))
    throw ApiError.forbidden("Only the organizer can handle notices");
  if (!notice.handledAt) await notice.update({ handledAt: new Date(), handledBy: actor.id });
  return presentNotice(notice);
};

// Scorer/organizer dashboard: live first, then upcoming
const listMyScoringMatches = async (user) => {
  const ids = [
    ...new Set([
      ...(await liveRepository.findScorerTournamentIds(user.id)),
      ...(await liveRepository.findOrganizedTournamentIds(user.id)),
    ]),
  ];
  const matches = await liveRepository.findUpcomingMatches(ids);
  return matches.map((match) => ({
    ...presentMatch(match),
    tournament: {
      id: match.tournament.uuid,
      slug: match.tournament.slug,
      name: match.tournament.name,
    },
  }));
};

module.exports = {
  changePeriod,
  addEvent,
  undoLastEvent,
  declareResult,
  awardMatch,
  cancelMatch,
  getMatchDetail,
  getLive,
  getConsole,
  getStandings,
  getLeaders,
  listCardNotices,
  handleCardNotice,
  listMyScoringMatches,
};
