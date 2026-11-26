const { sequelize } = require("../models");
const staffRepository = require("../repositories/staff.repository");
const inviteRepository = require("../repositories/invite.repository");
const inviteService = require("./invite.service");
const teamService = require("./team.service");
const userService = require("./user.service");
const { findManageableTournament } = require("./tournamentAccess.service");
const emailTemplates = require("../utils/emailTemplates");
const ApiError = require("../utils/ApiError");
const { INVITE_TTL_DAYS, INVITE_TYPE } = require("../constants/invite.constants");
const { STAFF_ROLE, STAFF_STATUS, TEAM_RULES } = require("../constants/team.constants");

const STAFF_ROLE_LABEL = Object.freeze({
  [STAFF_ROLE.SCORER]: "Scorer",
  [STAFF_ROLE.MEDIA_OPERATOR]: "Media operator",
});

const presentStaff = async (staff) => ({
  id: staff.uuid,
  staffRole: staff.staffRole,
  status: staff.status,
  person: await teamService.presentPerson(staff.user),
  // Managers only see this list, so the email helps them tell invites apart
  email: staff.user?.email,
  joinedAt: staff.joinedAt,
});

const listStaff = async (actor, tournamentId) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  return Promise.all(
    (await staffRepository.findStaffByTournament(tournament.id)).map(presentStaff),
  );
};

// Max 2 per role; pending invites count so the limit can't be exceeded by accepting later
const inviteStaff = async (actor, tournamentId, { staffRole, person }) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  teamService.assertTournamentOpenForTeams(tournament);

  const { staffId, url, invitee } = await sequelize.transaction(async (transaction) => {
    if (
      (await staffRepository.countStaffInRole(tournament.id, staffRole, { transaction })) >=
      TEAM_RULES.MAX_STAFF_PER_ROLE
    ) {
      throw ApiError.conflict(
        `A tournament can have at most ${TEAM_RULES.MAX_STAFF_PER_ROLE} ${STAFF_ROLE_LABEL[staffRole].toLowerCase()}s`,
      );
    }
    const user = await userService.resolveInvitee(person, actor, "person", { transaction });
    if (
      await staffRepository.findLockingStaff(tournament.id, user.id, staffRole, { transaction })
    ) {
      throw ApiError.conflict(
        `${user.fullName} is already a ${STAFF_ROLE_LABEL[staffRole].toLowerCase()} here`,
      );
    }
    const staff = await staffRepository.createStaff(
      {
        tournamentId: tournament.id,
        userId: user.id,
        staffRole,
        status: STAFF_STATUS.INVITED,
        invitedBy: actor.id,
      },
      { transaction },
    );
    const invite = await inviteService.createInvite(
      { type: INVITE_TYPE.STAFF_ASSIGN, user, inviter: actor, payload: { staffId: staff.id } },
      { transaction },
    );
    return { staffId: staff.id, url: invite.url, invitee: user };
  });

  await teamService.sendQuietly({
    to: invitee.email,
    ...emailTemplates.staffInvite({
      fullName: invitee.fullName,
      inviterName: actor.fullName,
      roleLabel: STAFF_ROLE_LABEL[staffRole],
      tournamentName: tournament.name,
      url,
      ttlDays: INVITE_TTL_DAYS,
      needsAccountSetup: inviteService.needsAccountSetup(invitee),
    }),
  });
  return presentStaff(await staffRepository.findStaffById(staffId));
};

// Organizer can remove staff any time; a pending invite is revoked
const removeStaff = async (actor, tournamentId, staffUuid) => {
  const tournament = await findManageableTournament(actor, tournamentId);
  const staff = await staffRepository.findStaffByUuid(tournament.id, staffUuid);
  if (!staff || ![STAFF_STATUS.INVITED, STAFF_STATUS.ACTIVE].includes(staff.status))
    throw ApiError.notFound("Staff member not found");
  await sequelize.transaction(async (transaction) => {
    await staffRepository.updateStaff(staff, { status: STAFF_STATUS.REMOVED }, { transaction });
    await inviteRepository.revokeInvitesForPayloadIds(
      INVITE_TYPE.STAFF_ASSIGN,
      "staffId",
      [staff.id],
      { transaction },
    );
  });
};

// ---------- invite handlers ----------

const findInvitedStaff = async (invite, { transaction }) => {
  const staff = await staffRepository.findStaffById(invite.payload?.staffId, { transaction });
  if (!staff || staff.status !== STAFF_STATUS.INVITED)
    throw ApiError.notFound("This invitation is no longer valid");
  return staff;
};

inviteService.registerInviteHandler(INVITE_TYPE.STAFF_ASSIGN, {
  accept: async (invite, { transaction }) =>
    staffRepository.updateStaff(
      await findInvitedStaff(invite, { transaction }),
      { status: STAFF_STATUS.ACTIVE, joinedAt: new Date() },
      { transaction },
    ),
  decline: async (invite, { transaction }) =>
    staffRepository.updateStaff(
      await findInvitedStaff(invite, { transaction }),
      { status: STAFF_STATUS.DECLINED },
      { transaction },
    ),
  describeMany: async (invites) => {
    const staffRows = await staffRepository.findStaffByIds(
      invites.map((invite) => invite.payload?.staffId),
    );
    const byId = new Map(staffRows.map((staff) => [staff.id, staff]));
    return new Map(
      invites.map((invite) => {
        const staff = byId.get(invite.payload?.staffId);
        return [
          invite.id,
          staff && {
            staffRole: staff.staffRole,
            roleLabel: STAFF_ROLE_LABEL[staff.staffRole],
            tournament: teamService.presentTournamentSummary(staff.tournament),
          },
        ];
      }),
    );
  },
});

module.exports = { listStaff, inviteStaff, removeStaff, STAFF_ROLE_LABEL };
