const { sequelize } = require("../models");
const config = require("../config/env");
const logger = require("../config/logger");
const paymentRepository = require("../repositories/payment.repository");
const teamRepository = require("../repositories/team.repository");
const inviteRepository = require("../repositories/invite.repository");
const positionRepository = require("../repositories/position.repository");
const userRepository = require("../repositories/user.repository");
const emailService = require("./email.service");
const inviteService = require("./invite.service");
const storageService = require("./storage.service");
const userService = require("./user.service");
const {
  canManageTournament,
  findManageableTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const emailTemplates = require("../utils/emailTemplates");
const ApiError = require("../utils/ApiError");
const { todayInAppTimezone } = require("../utils/date");
const { INVITE_TYPE } = require("../constants/invite.constants");
const { TOURNAMENT_STATUS } = require("../constants/tournament.constants");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");
const {
  LIVE_TEAM_STATUSES,
  LOCKING_MEMBER_STATUSES,
  MEMBER_STATUS,
  REVIEW_DECISION,
  TEAM_RULES,
  TEAM_SOURCE,
  TEAM_STATUS,
} = require("../constants/team.constants");

const CLOSED_TOURNAMENT_STATUSES = [TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED];
const REMOVABLE_TOURNAMENT_STATUSES = [
  TOURNAMENT_STATUS.DRAFT,
  TOURNAMENT_STATUS.REGISTRATION_OPEN,
];

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// ---------- presenters ----------

const presentPerson = async (user) =>
  user && {
    id: user.uuid,
    fullName: user.fullName,
    photoUrl: await storageService.getReadUrl(user.photoKey),
    isVerified: user.accountStatus === ACCOUNT_STATUS.VERIFIED,
  };

const presentTeam = async (team, { squadCount, includeReview = false } = {}) => ({
  id: team.uuid,
  name: team.name,
  shortName: team.shortName,
  status: team.status,
  source: team.source,
  isSquadLocked: team.isSquadLocked,
  captain: await presentPerson(team.captain),
  squadCount: squadCount ?? null,
  confirmedAt: team.confirmedAt,
  createdAt: team.createdAt,
  ...(includeReview && {
    requestNumber: team.requestNumber,
    rejectionReason: team.rejectionReason,
    reviewedAt: team.reviewedAt,
  }),
});

const presentTournamentSummary = (tournament) => ({
  id: tournament.uuid,
  slug: tournament.slug,
  name: tournament.name,
  status: tournament.status,
  minSquadSize: tournament.minSquadSize,
  maxSquadSize: tournament.maxSquadSize,
  entryFee: tournament.entryFee === null ? null : Number(tournament.entryFee),
});

// ---------- access helpers ----------

const isCaptainOf = (user, team) => Boolean(user) && team.captainUserId === user.id;

const findTeam = async (teamUuid, { transaction, lock } = {}) => {
  const team = await teamRepository.findTeamByUuid(teamUuid, { transaction, lock });
  if (!team) throw ApiError.notFound("Team not found");
  return team;
};

const findTeamForManager = async (actor, teamUuid, options) => {
  const team = await findTeam(teamUuid, options);
  if (!canManageTournament(actor, team.tournament))
    throw ApiError.forbidden("You can't manage this team");
  return team;
};

const assertTournamentOpenForTeams = (tournament) => {
  if (CLOSED_TOURNAMENT_STATUSES.includes(tournament.status)) {
    throw ApiError.badRequest("This tournament has ended. Teams can't be changed.");
  }
};

// maxTeams counts teams holding a slot (awaiting payment or confirmed)
const assertSlotAvailable = async (tournament, { transaction }) => {
  if (!tournament.maxTeams) return;
  if (
    (await teamRepository.countSlotTeams(tournament.id, { transaction })) >= tournament.maxTeams
  ) {
    throw ApiError.conflict(
      `This tournament already has its maximum of ${tournament.maxTeams} teams`,
    );
  }
};

const assertTeamNameAvailable = async (tournamentId, name, { excludeTeamId, transaction } = {}) => {
  if (await teamRepository.isTeamNameTaken(tournamentId, name, { excludeTeamId, transaction })) {
    throw fieldError("name", "Another team in this tournament already uses this name");
  }
};

const assertNotInAnotherTeam = async (tournamentId, user, field, { transaction }) => {
  if (await teamRepository.findLockingMembership(tournamentId, user.id, { transaction })) {
    throw fieldError(field, `${user.fullName} is already in a team in this tournament`);
  }
};

/**
 * Verified players pick from their own profile positions; guests (and unverified sign-ups)
 * have none yet, so the chosen position is added to their profile.
 */
const assertPlayablePosition = async (user, positionId, field, { transaction }) => {
  if (!(await positionRepository.findPositionById(positionId)))
    throw fieldError(field, "Choose a valid position");
  if (user.accountStatus !== ACCOUNT_STATUS.VERIFIED) {
    await positionRepository.addUserPositionIfMissing(user.id, positionId, { transaction });
    return;
  }
  const positionIds = await positionRepository.findUserPositionIds(user.id, { transaction });
  if (!positionIds.includes(positionId))
    throw fieldError(field, `Choose one of ${user.fullName}'s profile positions`);
};

// Free tournaments confirm on approval; paid ones wait for payment (Phase 4) or manual confirmation
const statusAfterApproval = (tournament) =>
  Number(tournament.entryFee ?? 0) === 0 ? TEAM_STATUS.CONFIRMED : TEAM_STATUS.AWAITING_PAYMENT;

const confirmationFields = (status, actor) =>
  status === TEAM_STATUS.CONFIRMED
    ? { confirmedAt: new Date(), confirmedBy: actor?.id ?? null }
    : {};

const createCaptainMember = (team, captain, { jerseyNumber, positionId }, { transaction }) =>
  teamRepository.createMember(
    {
      teamId: team.id,
      tournamentId: team.tournamentId,
      userId: captain.id,
      positionId,
      jerseyNumber,
      isCaptain: true,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: new Date(),
    },
    { transaction },
  );

// ---------- emails (sent after commit; a failed email never undoes the change) ----------

const sendQuietly = async (message) => {
  try {
    await emailService.sendEmail(message);
  } catch (err) {
    logger.warn({ err, to: message.to }, "Team email failed");
  }
};

// ---------- queries ----------

const withSquadCounts = async (teams, options) => {
  const counts = await teamRepository.countActiveMembersByTeam(teams.map((team) => team.id));
  return Promise.all(
    teams.map((team) => presentTeam(team, { squadCount: counts[team.id] ?? 0, ...options })),
  );
};

// Public sees confirmed teams; organizers and admins see every team and request
const listTournamentTeams = async (viewer, tournamentId, { status }) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const isManager = canManageTournament(viewer, tournament);
  const statuses = isManager ? (status ? [status] : null) : [TEAM_STATUS.CONFIRMED];
  const teams = await teamRepository.findTeamsByTournament(tournament.id, { statuses });
  const presented = await withSquadCounts(teams, { includeReview: isManager });
  if (!isManager) return presented;
  return attachLatestPayments(teams, presented);
};

// Organizers see how each team paid (latest receipt), without a query per team
const attachLatestPayments = async (teams, presented) => {
  const payments = await paymentRepository.findReceiptPaymentsByTeams(teams.map((team) => team.id));
  const latestByTeam = {};
  payments.forEach((payment) => {
    latestByTeam[payment.teamId] ??= {
      id: payment.uuid,
      method: payment.method,
      offlineMode: payment.offlineMode,
      status: payment.status,
      amount: Number(payment.amount),
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt,
    };
  });
  return presented.map((team, index) => ({
    ...team,
    latestPayment: latestByTeam[teams[index].id] ?? null,
  }));
};

// ---------- commands ----------

const addTeam = async (
  actor,
  tournamentId,
  { name, shortName, captain, captainJerseyNumber, captainPositionId },
) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  assertTournamentOpenForTeams(tournament);

  const result = await sequelize.transaction(async (transaction) => {
    await assertSlotAvailable(tournament, { transaction });
    await assertTeamNameAvailable(tournament.id, name, { transaction });
    const captainUser = await userService.resolveInvitee(captain, actor, "captain", {
      transaction,
    });
    await assertNotInAnotherTeam(tournament.id, captainUser, "captain", { transaction });
    await assertPlayablePosition(captainUser, captainPositionId, "captainPositionId", {
      transaction,
    });

    const status = statusAfterApproval(tournament);
    const team = await teamRepository.createTeam(
      {
        tournamentId: tournament.id,
        name,
        shortName,
        captainUserId: captainUser.id,
        status,
        source: TEAM_SOURCE.ORGANIZER,
        createdBy: actor.id,
        ...confirmationFields(status, actor),
      },
      { transaction },
    );
    await createCaptainMember(
      team,
      captainUser,
      { jerseyNumber: captainJerseyNumber, positionId: captainPositionId },
      { transaction },
    );
    // Guest captains need an account to manage the squad
    const setupUrl = inviteService.needsAccountSetup(captainUser)
      ? await inviteService.createAccountSetupInvite(captainUser, actor, { transaction })
      : null;
    return { team, captainUser, setupUrl };
  });

  await sendQuietly({
    to: result.captainUser.email,
    ...emailTemplates.captainAssigned({
      fullName: result.captainUser.fullName,
      teamName: name,
      tournamentName: tournament.name,
      url: result.setupUrl ?? `${config.appUrl}/dashboard`,
      needsAccountSetup: Boolean(result.setupUrl),
    }),
  });
  return presentTeam(await teamRepository.findTeamById(result.team.id), {
    squadCount: 1,
    includeReview: true,
  });
};

const assertCanRequest = (tournament) => {
  const deadlinePassed =
    tournament.registrationDeadline && tournament.registrationDeadline < todayInAppTimezone();
  if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION_OPEN || deadlinePassed) {
    throw ApiError.badRequest("Registration for this tournament is closed");
  }
};

// Max 2 requests per captain per tournament (business rule); returns the next request number
const nextRequestNumber = async (tournament, user, { transaction }) => {
  const previousRequests = await teamRepository.countCaptainRequests(tournament.id, user.id, {
    transaction,
  });
  if (previousRequests >= TEAM_RULES.MAX_REQUESTS_PER_CAPTAIN) {
    throw ApiError.conflict(
      "You've used both requests for this tournament. Contact the organizer.",
    );
  }
  return previousRequests + 1;
};

const requestTeam = async (user, tournamentId, { name, shortName, jerseyNumber, positionId }) => {
  if (user.accountRole !== ACCOUNT_ROLE.MEMBER)
    throw ApiError.forbidden("Only players can request to register a team");
  const tournament = await findViewableTournament(user, tournamentId);
  assertCanRequest(tournament);

  const team = await sequelize.transaction(async (transaction) => {
    const requestNumber = await nextRequestNumber(tournament, user, { transaction });
    await assertNotInAnotherTeam(tournament.id, user, "captain", { transaction });
    await assertTeamNameAvailable(tournament.id, name, { transaction });
    await assertPlayablePosition(user, positionId, "positionId", { transaction });

    const created = await teamRepository.createTeam(
      {
        tournamentId: tournament.id,
        name,
        shortName,
        captainUserId: user.id,
        status: TEAM_STATUS.PENDING_APPROVAL,
        source: TEAM_SOURCE.REQUEST,
        requestNumber,
        createdBy: user.id,
      },
      { transaction },
    );
    // The pending request already holds the captain's one-team-per-tournament slot
    await createCaptainMember(created, user, { jerseyNumber, positionId }, { transaction });
    return created;
  });
  return presentTeam(await teamRepository.findTeamById(team.id), {
    squadCount: 1,
    includeReview: true,
  });
};

const releaseTeam = async (team, status, actor, { transaction }) => {
  await teamRepository.updateTeam(team, { status, updatedBy: actor.id }, { transaction });
  const cancelledMemberIds = await teamRepository.releaseTeamMembers(team.id, { transaction });
  await inviteRepository.revokeInvitesForPayloadIds(
    INVITE_TYPE.TEAM_JOIN,
    "teamMemberId",
    cancelledMemberIds,
    { transaction },
  );
};

const reviewTeamRequest = async (actor, teamUuid, { decision, reason }) => {
  const result = await sequelize.transaction(async (transaction) => {
    const team = await findTeamForManager(actor, teamUuid, { transaction, lock: true });
    if (team.status !== TEAM_STATUS.PENDING_APPROVAL)
      throw ApiError.conflict("This request was already reviewed");
    const reviewFields = { reviewedAt: new Date(), reviewedBy: actor.id };

    if (decision === REVIEW_DECISION.REJECT) {
      await teamRepository.updateTeam(
        team,
        { ...reviewFields, rejectionReason: reason ?? null },
        { transaction },
      );
      await releaseTeam(team, TEAM_STATUS.REJECTED, actor, { transaction });
      return { team, isApproved: false };
    }

    assertTournamentOpenForTeams(team.tournament);
    await assertSlotAvailable(team.tournament, { transaction });
    const status = statusAfterApproval(team.tournament);
    await teamRepository.updateTeam(
      team,
      { ...reviewFields, status, ...confirmationFields(status, actor) },
      { transaction },
    );
    return { team, isApproved: true };
  });

  const { team, isApproved } = result;
  const captain = await userRepository.findUserById(team.captainUserId);
  await sendQuietly({
    to: captain.email,
    ...emailTemplates.teamRequestDecision({
      fullName: captain.fullName,
      teamName: team.name,
      tournamentName: team.tournament.name,
      isApproved,
      reason,
      url: `${config.appUrl}/dashboard`,
      canRequestAgain: team.requestNumber < TEAM_RULES.MAX_REQUESTS_PER_CAPTAIN,
    }),
  });
  return getTeamForViewer(actor, teamUuid);
};

const lockErrors = (team, members) => {
  const { minSquadSize, maxSquadSize } = team.tournament;
  const activeMembers = members.filter((member) => member.status === MEMBER_STATUS.ACTIVE);
  const pendingInvites = members.filter((member) => member.status === MEMBER_STATUS.INVITED);
  return [
    minSquadSize &&
      activeMembers.length < minSquadSize &&
      `Squad has ${activeMembers.length} players; at least ${minSquadSize} are required`,
    maxSquadSize &&
      activeMembers.length > maxSquadSize &&
      `Squad has ${activeMembers.length} players; at most ${maxSquadSize} are allowed`,
    pendingInvites.length &&
      `${pendingInvites.length} invitation(s) are still pending. The captain must wait for answers or cancel them`,
  ].filter(Boolean);
};

const setTeamLock = async (actor, teamUuid, { isLocked }) => {
  const team = await findTeamForManager(actor, teamUuid);
  if (team.status !== TEAM_STATUS.CONFIRMED)
    throw ApiError.conflict("Only confirmed teams can be locked");
  if (isLocked) {
    const members = await teamRepository.findMembers(team.id, {
      statuses: LOCKING_MEMBER_STATUSES,
    });
    const errors = lockErrors(team, members);
    if (errors.length) {
      throw ApiError.badRequest(
        "The squad isn't ready to lock",
        errors.map((message) => ({ field: "squad", message })),
      );
    }
  }
  await teamRepository.updateTeam(team, {
    isSquadLocked: isLocked,
    lockedAt: isLocked ? new Date() : null,
    lockedBy: isLocked ? actor.id : null,
  });
  return getTeamForViewer(actor, teamUuid);
};

const WITHDRAWABLE_STATUSES = [TEAM_STATUS.PENDING_APPROVAL, TEAM_STATUS.AWAITING_PAYMENT];

const withdrawTeam = async (user, teamUuid) => {
  await sequelize.transaction(async (transaction) => {
    const team = await findTeam(teamUuid, { transaction, lock: true });
    if (!isCaptainOf(user, team))
      throw ApiError.forbidden("Only the captain can withdraw this team");
    if (!WITHDRAWABLE_STATUSES.includes(team.status))
      throw ApiError.conflict("Confirmed teams can only be removed by the organizer");
    await releaseTeam(team, TEAM_STATUS.WITHDRAWN, user, { transaction });
  });
};

const removeTeam = async (actor, teamUuid) => {
  await sequelize.transaction(async (transaction) => {
    const team = await findTeamForManager(actor, teamUuid, { transaction, lock: true });
    if (!REMOVABLE_TOURNAMENT_STATUSES.includes(team.tournament.status)) {
      throw ApiError.conflict("Teams can't be removed after the tournament has started");
    }
    if (!LIVE_TEAM_STATUSES.includes(team.status))
      throw ApiError.conflict("This team is no longer in the tournament");
    await releaseTeam(team, TEAM_STATUS.REMOVED, actor, { transaction });
  });
};

const updateTeamDetails = async (user, teamUuid, changes) => {
  const team = await findTeam(teamUuid);
  if (!isCaptainOf(user, team) && !canManageTournament(user, team.tournament))
    throw ApiError.forbidden("You can't edit this team");
  if (team.isSquadLocked)
    throw ApiError.conflict("The team is locked. Ask the organizer to unlock it.");
  if (!LIVE_TEAM_STATUSES.includes(team.status))
    throw ApiError.conflict("This team is no longer in the tournament");
  if (changes.name)
    await assertTeamNameAvailable(team.tournamentId, changes.name, { excludeTeamId: team.id });
  await teamRepository.updateTeam(team, { ...changes, updatedBy: user.id });
  return getTeamForViewer(user, teamUuid);
};

const MEMBER_ROLE = Object.freeze({
  PUBLIC: "public",
  MEMBER: "member",
  CAPTAIN: "captain",
  MANAGER: "manager",
});

const viewerRole = (viewer, team, members) => {
  if (canManageTournament(viewer, team.tournament)) return MEMBER_ROLE.MANAGER;
  if (isCaptainOf(viewer, team)) return MEMBER_ROLE.CAPTAIN;
  if (viewer && members.some((member) => member.userId === viewer.id)) return MEMBER_ROLE.MEMBER;
  return MEMBER_ROLE.PUBLIC;
};

const presentMember = async (member) => ({
  id: member.uuid,
  player: await presentPerson(member.user),
  position: member.position && {
    id: member.position.id,
    name: member.position.name,
    shortName: member.position.shortName,
  },
  jerseyNumber: member.jerseyNumber,
  isCaptain: member.isCaptain,
  status: member.status,
});

// Public sees confirmed teams with active players; captain, members and managers see pending invites too
const getTeamForViewer = async (viewer, teamUuid) => {
  const team = await findTeam(teamUuid);
  const members = await teamRepository.findMembers(team.id, { statuses: LOCKING_MEMBER_STATUSES });
  const role = viewerRole(viewer, team, members);
  if (role === MEMBER_ROLE.PUBLIC && team.status !== TEAM_STATUS.CONFIRMED)
    throw ApiError.notFound("Team not found");

  const visibleMembers =
    role === MEMBER_ROLE.PUBLIC
      ? members.filter((member) => member.status === MEMBER_STATUS.ACTIVE)
      : members;
  const activeCount = members.filter((member) => member.status === MEMBER_STATUS.ACTIVE).length;
  return {
    ...(await presentTeam(team, {
      squadCount: activeCount,
      includeReview: role !== MEMBER_ROLE.PUBLIC,
    })),
    tournament: presentTournamentSummary(team.tournament),
    viewerRole: role,
    members: await Promise.all(visibleMembers.map(presentMember)),
  };
};

const listMyTeams = async (user) => {
  const memberships = await teamRepository.findMembershipsByUser(user.id);
  return Promise.all(
    memberships.map(async (membership) => ({
      membershipId: membership.uuid,
      membershipStatus: membership.status,
      isCaptain: membership.isCaptain,
      jerseyNumber: membership.jerseyNumber,
      position: membership.position && {
        id: membership.position.id,
        name: membership.position.name,
      },
      team: await presentTeam(membership.team),
      tournament: presentTournamentSummary(membership.team.tournament),
    })),
  );
};

module.exports = {
  presentPerson,
  presentMember,
  presentTournamentSummary,
  isCaptainOf,
  findTeam,
  assertTournamentOpenForTeams,
  assertNotInAnotherTeam,
  assertPlayablePosition,
  sendQuietly,
  listTournamentTeams,
  addTeam,
  requestTeam,
  reviewTeamRequest,
  setTeamLock,
  withdrawTeam,
  removeTeam,
  updateTeamDetails,
  getTeamForViewer,
  listMyTeams,
};
