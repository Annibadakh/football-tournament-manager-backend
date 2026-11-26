const { sequelize } = require("../models");
const teamRepository = require("../repositories/team.repository");
const inviteRepository = require("../repositories/invite.repository");
const userRepository = require("../repositories/user.repository");
const inviteService = require("./invite.service");
const teamService = require("./team.service");
const userService = require("./user.service");
const emailTemplates = require("../utils/emailTemplates");
const ApiError = require("../utils/ApiError");
const { INVITE_TTL_DAYS, INVITE_TYPE } = require("../constants/invite.constants");
const {
  LOCKING_MEMBER_STATUSES,
  MEMBER_STATUS,
  TEAM_STATUS,
} = require("../constants/team.constants");

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

// Squad changes: captain only, confirmed team, not locked, tournament still running
const findTeamForCaptain = async (user, teamUuid, { transaction } = {}) => {
  const team = await teamService.findTeam(teamUuid, { transaction, lock: Boolean(transaction) });
  if (!teamService.isCaptainOf(user, team))
    throw ApiError.forbidden("Only the captain can change the squad");
  if (team.status !== TEAM_STATUS.CONFIRMED)
    throw ApiError.conflict("Players can be added once the team is confirmed");
  if (team.isSquadLocked)
    throw ApiError.conflict("The squad is locked. Ask the organizer to unlock it.");
  teamService.assertTournamentOpenForTeams(team.tournament);
  return team;
};

const findMember = async (team, memberUuid, { transaction } = {}) => {
  const member = await teamRepository.findMemberByUuid(team.id, memberUuid, { transaction });
  if (!member || !LOCKING_MEMBER_STATUSES.includes(member.status))
    throw ApiError.notFound("Player not found in this squad");
  return member;
};

const assertJerseyAvailable = async (
  teamId,
  jerseyNumber,
  { excludeMemberId, transaction } = {},
) => {
  if (await teamRepository.isJerseyTaken(teamId, jerseyNumber, { excludeMemberId, transaction })) {
    throw fieldError("jerseyNumber", `Jersey #${jerseyNumber} is already taken in this team`);
  }
};

const assertSquadHasRoom = async (team, { transaction }) => {
  const { maxSquadSize } = team.tournament;
  if (!maxSquadSize) return;
  const members = await teamRepository.findMembers(team.id, {
    statuses: LOCKING_MEMBER_STATUSES,
    transaction,
  });
  if (members.length >= maxSquadSize) {
    throw ApiError.conflict(
      `The squad is full (${maxSquadSize} players including pending invites)`,
    );
  }
};

const sendTeamInviteEmail = (member, team, captain, url) =>
  teamService.sendQuietly({
    to: member.user.email,
    ...emailTemplates.teamInvite({
      fullName: member.user.fullName,
      captainName: captain.fullName,
      teamName: team.name,
      tournamentName: team.tournament.name,
      positionName: member.position.name,
      jerseyNumber: member.jerseyNumber,
      url,
      ttlDays: INVITE_TTL_DAYS,
      needsAccountSetup: inviteService.needsAccountSetup(member.user),
    }),
  });

const createMemberInvite = (member, invitee, captain, { transaction }) =>
  inviteService.createInvite(
    {
      type: INVITE_TYPE.TEAM_JOIN,
      user: invitee,
      inviter: captain,
      payload: { teamMemberId: member.id },
    },
    { transaction },
  );

const invitePlayer = async (captain, teamUuid, { player, positionId, jerseyNumber }) => {
  const { memberId, url } = await sequelize.transaction(async (transaction) => {
    const team = await findTeamForCaptain(captain, teamUuid, { transaction });
    await assertSquadHasRoom(team, { transaction });
    await assertJerseyAvailable(team.id, jerseyNumber, { transaction });
    const invitee = await userService.resolveInvitee(player, captain, "player", { transaction });
    await teamService.assertNotInAnotherTeam(team.tournamentId, invitee, "player", { transaction });
    await teamService.assertPlayablePosition(invitee, positionId, "positionId", { transaction });

    const member = await teamRepository.createMember(
      {
        teamId: team.id,
        tournamentId: team.tournamentId,
        userId: invitee.id,
        positionId,
        jerseyNumber,
        status: MEMBER_STATUS.INVITED,
        invitedBy: captain.id,
      },
      { transaction },
    );
    const invite = await createMemberInvite(member, invitee, captain, { transaction });
    return { memberId: member.id, url: invite.url };
  });

  const member = await teamRepository.findMemberById(memberId);
  await sendTeamInviteEmail(member, member.team, captain, url);
  return teamService.presentMember(member);
};

const updatePlayer = async (captain, teamUuid, memberUuid, { jerseyNumber, positionId }) => {
  await sequelize.transaction(async (transaction) => {
    const team = await findTeamForCaptain(captain, teamUuid, { transaction });
    const member = await findMember(team, memberUuid, { transaction });
    if (jerseyNumber !== undefined)
      await assertJerseyAvailable(team.id, jerseyNumber, {
        excludeMemberId: member.id,
        transaction,
      });
    if (positionId !== undefined) {
      const player = await userRepository.findUserById(member.userId, { transaction });
      await teamService.assertPlayablePosition(player, positionId, "positionId", { transaction });
    }
    await teamRepository.updateMember(
      member,
      {
        ...(jerseyNumber !== undefined && { jerseyNumber }),
        ...(positionId !== undefined && { positionId }),
      },
      { transaction },
    );
  });
  return teamService.getTeamForViewer(captain, teamUuid);
};

// Captain removes a player or cancels a pending invite; the captain can't remove themselves
const removePlayer = async (captain, teamUuid, memberUuid) => {
  await sequelize.transaction(async (transaction) => {
    const team = await findTeamForCaptain(captain, teamUuid, { transaction });
    const member = await findMember(team, memberUuid, { transaction });
    if (member.isCaptain) throw ApiError.badRequest("The captain can't be removed from the team");

    const isPending = member.status === MEMBER_STATUS.INVITED;
    await teamRepository.updateMember(
      member,
      { status: isPending ? MEMBER_STATUS.CANCELLED : MEMBER_STATUS.REMOVED },
      { transaction },
    );
    if (isPending) {
      await inviteRepository.revokeInvitesForPayloadIds(
        INVITE_TYPE.TEAM_JOIN,
        "teamMemberId",
        [member.id],
        { transaction },
      );
    }
  });
};

const resendPlayerInvite = async (captain, teamUuid, memberUuid) => {
  const { memberId, url } = await sequelize.transaction(async (transaction) => {
    const team = await findTeamForCaptain(captain, teamUuid, { transaction });
    const member = await findMember(team, memberUuid, { transaction });
    if (member.status !== MEMBER_STATUS.INVITED)
      throw ApiError.conflict("This player already answered the invitation");
    await inviteRepository.revokeInvitesForPayloadIds(
      INVITE_TYPE.TEAM_JOIN,
      "teamMemberId",
      [member.id],
      { transaction },
    );
    const invite = await createMemberInvite(member, member.user, captain, { transaction });
    return { memberId: member.id, url: invite.url };
  });
  const member = await teamRepository.findMemberById(memberId);
  await sendTeamInviteEmail(member, member.team, captain, url);
};

// ---------- invite handlers (accept / decline from email link or app) ----------

const findInvitedMember = async (invite, { transaction }) => {
  const member = await teamRepository.findMemberById(invite.payload?.teamMemberId, { transaction });
  if (!member || member.status !== MEMBER_STATUS.INVITED)
    throw ApiError.notFound("This invitation is no longer valid");
  return member;
};

const acceptMembership = async (invite, { transaction }) => {
  const member = await findInvitedMember(invite, { transaction });
  const { team } = member;
  if (team.status !== TEAM_STATUS.CONFIRMED || team.isSquadLocked) {
    throw ApiError.conflict("This team isn't accepting players right now");
  }
  teamService.assertTournamentOpenForTeams(team.tournament);
  await teamRepository.updateMember(
    member,
    { status: MEMBER_STATUS.ACTIVE, joinedAt: new Date() },
    { transaction },
  );
};

const declineMembership = async (invite, { transaction }) => {
  const member = await findInvitedMember(invite, { transaction });
  await teamRepository.updateMember(member, { status: MEMBER_STATUS.DECLINED }, { transaction });
};

// One query for the whole invite list (no N+1)
const describeMembershipInvites = async (invites) => {
  const members = await teamRepository.findMembersByIds(
    invites.map((invite) => invite.payload?.teamMemberId),
  );
  const memberById = new Map(members.map((member) => [member.id, member]));
  return new Map(
    invites.map((invite) => {
      const member = memberById.get(invite.payload?.teamMemberId);
      return [
        invite.id,
        member && {
          teamId: member.team.uuid,
          teamName: member.team.name,
          tournament: teamService.presentTournamentSummary(member.team.tournament),
          position: member.position.name,
          jerseyNumber: member.jerseyNumber,
        },
      ];
    }),
  );
};

inviteService.registerInviteHandler(INVITE_TYPE.TEAM_JOIN, {
  accept: acceptMembership,
  decline: declineMembership,
  describeMany: describeMembershipInvites,
});

module.exports = { invitePlayer, updatePlayer, removePlayer, resendPlayerInvite };
