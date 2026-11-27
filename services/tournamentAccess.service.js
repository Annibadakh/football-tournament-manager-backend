const tournamentRepository = require("../repositories/tournament.repository");
const ApiError = require("../utils/ApiError");
const { ACCOUNT_ROLE } = require("../constants/user.constants");
const { PUBLIC_STATUSES } = require("../constants/tournament.constants");

const isAdmin = (user) => [ACCOUNT_ROLE.SUPERADMIN, ACCOUNT_ROLE.ADMIN].includes(user?.accountRole);

// Admins manage every tournament; organizers only their own
const canManageTournament = (user, tournament) =>
  Boolean(user) && (isAdmin(user) || tournament.organizerId === user.id);

const isPubliclyVisible = (tournament) => PUBLIC_STATUSES.includes(tournament.status);

const findManageableTournament = async (user, identifier, { transaction } = {}) => {
  const tournament = await tournamentRepository.findTournamentByUuidOrSlug(identifier, {
    transaction,
  });
  if (!tournament) throw ApiError.notFound("Tournament not found");
  if (!canManageTournament(user, tournament))
    throw ApiError.forbidden("You can't manage this tournament");
  return tournament;
};

// Drafts look like they don't exist to anyone who can't manage them
const findViewableTournament = async (user, identifier) => {
  const tournament = await tournamentRepository.findTournamentByUuidOrSlug(identifier);
  if (!tournament || (!isPubliclyVisible(tournament) && !canManageTournament(user, tournament))) {
    throw ApiError.notFound("Tournament not found");
  }
  return tournament;
};

// Same visibility rule as findViewableTournament, for a tournament already loaded
const assertViewable = (user, tournament) => {
  if (!tournament || (!isPubliclyVisible(tournament) && !canManageTournament(user, tournament))) {
    throw ApiError.notFound("Tournament not found");
  }
  return tournament;
};

module.exports = {
  isAdmin,
  canManageTournament,
  findManageableTournament,
  findViewableTournament,
  assertViewable,
};
