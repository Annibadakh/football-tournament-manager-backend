const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const tournamentRepository = require("../repositories/tournament.repository");
const ruleRepository = require("../repositories/rule.repository");
const categoryRepository = require("../repositories/category.repository");
const userRepository = require("../repositories/user.repository");
const placeService = require("./place.service");
const storageService = require("./storage.service");
const uploadService = require("./upload.service");
const {
  isAdmin,
  findManageableTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const ApiError = require("../utils/ApiError");
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");
const {
  ADMIN_ONLY_FIELDS,
  NEAR_ME,
  PUBLIC_STATUSES,
  REQUIRED_FOR_REGISTRATION,
  STATUS_TRANSITIONS,
  STRUCTURE_FIELDS,
  STRUCTURE_LOCKED_STATUSES,
  TOURNAMENT_RULES,
  TOURNAMENT_STATUS,
} = require("../constants/tournament.constants");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");
const { UPLOAD_PURPOSE } = require("../constants/upload.constants");

const SORTABLE_FIELDS = ["startDate", "createdAt", "name"];
const METERS_PER_KM = 1000;

const presentCategory = (category) => category && { id: category.id, name: category.name };

const presentTournament = async (tournament) => {
  const distanceMeters = tournament.get("distanceMeters");
  return {
    id: tournament.uuid,
    slug: tournament.slug,
    name: tournament.name,
    description: tournament.description,
    status: tournament.status,
    publishedAt: tournament.publishedAt,
    logoUrl: await storageService.getReadUrl(tournament.logoKey),
    bannerUrl: await storageService.getReadUrl(tournament.bannerKey),
    tournamentFormat: tournament.tournamentFormat,
    gameFormat: tournament.gameFormat && {
      ...presentCategory(tournament.gameFormat),
      playersPerSide: tournament.gameFormat.playersPerSide,
    },
    ageGroup: presentCategory(tournament.ageGroup),
    genderCategory: presentCategory(tournament.genderCategory),
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationDeadline: tournament.registrationDeadline,
    entryFee: tournament.entryFee === null ? null : Number(tournament.entryFee),
    minTeams: tournament.minTeams,
    maxTeams: tournament.maxTeams,
    minSquadSize: tournament.minSquadSize,
    maxSquadSize: tournament.maxSquadSize,
    points: { win: tournament.pointsWin, draw: tournament.pointsDraw, loss: tournament.pointsLoss },
    city: placeService.presentPlace(tournament.city),
    venue: placeService.presentPlace(tournament.venue),
    venueDetails: tournament.venueDetails,
    contactPhone: tournament.contactPhone,
    isStreamingEnabled: tournament.isStreamingEnabled,
    organizer: tournament.organizer && {
      id: tournament.organizer.uuid,
      fullName: tournament.organizer.fullName,
      photoUrl: await storageService.getReadUrl(tournament.organizer.photoKey),
    },
    ...(distanceMeters != null && { distanceKm: Math.round(Number(distanceMeters) / 100) / 10 }),
    createdAt: tournament.createdAt,
  };
};

const presentTournaments = (tournaments) => Promise.all(tournaments.map(presentTournament));

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150) || "tournament";

// Readable and stable: set once from the first name so shared links never break
const generateUniqueSlug = async (name) => {
  for (;;) {
    const slug = `${slugify(name)}-${crypto.randomBytes(4).toString("hex").slice(0, TOURNAMENT_RULES.SLUG_SUFFIX_LENGTH)}`;
    if (!(await tournamentRepository.isSlugTaken(slug))) return slug;
  }
};

const findOrganizerId = async (organizerUuid) => {
  const organizer = await userRepository.findUserByUuid(organizerUuid);
  const isUsable =
    organizer?.accountRole === ACCOUNT_ROLE.ORGANIZER &&
    organizer.accountStatus !== ACCOUNT_STATUS.BLOCKED;
  if (!isUsable)
    throw ApiError.badRequest("Choose a valid organizer", [
      { field: "organizerId", message: "Choose a valid organizer" },
    ]);
  return organizer.id;
};

const createTournament = async (actor, { name, organizerId, cityPlaceId, isStreamingEnabled }) => {
  const tournament = await sequelize.transaction(async (transaction) => {
    const created = await tournamentRepository.createTournament(
      {
        name,
        slug: await generateUniqueSlug(name),
        organizerId: await findOrganizerId(organizerId),
        cityPlaceId: await placeService.findPlaceIdByUuid(cityPlaceId, "cityPlaceId", {
          transaction,
        }),
        isStreamingEnabled,
        status: TOURNAMENT_STATUS.DRAFT,
        createdBy: actor.id,
      },
      { transaction },
    );
    // New tournaments start with the active master rule book (organizer can edit it)
    const masterRules = await ruleRepository.findRules();
    await ruleRepository.replaceTournamentRules(
      created.id,
      masterRules.map((rule) => ({ ruleId: rule.id })),
      { transaction },
    );
    return created;
  });
  return presentTournament(await tournamentRepository.findTournamentById(tournament.id));
};

const fieldErrors = (fields, message) => fields.map((field) => ({ field, message }));

const assertEditableFields = (actor, tournament, changes) => {
  const blockedAdminFields = isAdmin(actor)
    ? []
    : ADMIN_ONLY_FIELDS.filter((field) => field in changes);
  if (blockedAdminFields.length) {
    throw ApiError.forbidden("Only admins can change the organizer, city or live streaming");
  }
  if (STRUCTURE_LOCKED_STATUSES.includes(tournament.status)) {
    const lockedFields = STRUCTURE_FIELDS.filter((field) => field in changes);
    if (lockedFields.length) {
      throw ApiError.badRequest(
        "These settings can't change after the tournament has started",
        fieldErrors(lockedFields, "Locked after the tournament starts"),
      );
    }
  }
};

// Cross-field rules checked on the merged state, since updates are partial
const findConsistencyErrors = (state) => {
  const errors = [];
  if (state.startDate && state.endDate && state.endDate < state.startDate) {
    errors.push({ field: "endDate", message: "End date can't be before the start date" });
  }
  if (
    state.registrationDeadline &&
    state.startDate &&
    state.registrationDeadline > state.startDate
  ) {
    errors.push({
      field: "registrationDeadline",
      message: "Registration must close on or before the start date",
    });
  }
  if (state.minTeams && state.maxTeams && state.minTeams > state.maxTeams) {
    errors.push({ field: "minTeams", message: "Minimum teams can't be more than maximum teams" });
  }
  if (state.minSquadSize && state.maxSquadSize && state.minSquadSize > state.maxSquadSize) {
    errors.push({
      field: "minSquadSize",
      message: "Minimum squad size can't be more than maximum squad size",
    });
  }
  if (!(state.pointsWin >= state.pointsDraw && state.pointsDraw >= state.pointsLoss)) {
    errors.push({ field: "pointsWin", message: "Points must be win ≥ draw ≥ loss" });
  }
  return errors;
};

const resolveReferences = async (changes, { transaction }) => {
  const resolved = { ...changes };
  if ("organizerId" in changes) resolved.organizerId = await findOrganizerId(changes.organizerId);
  if ("cityPlaceId" in changes) {
    resolved.cityPlaceId = await placeService.findPlaceIdByUuid(
      changes.cityPlaceId,
      "cityPlaceId",
      { transaction },
    );
  }
  if ("venuePlaceId" in changes) {
    resolved.venuePlaceId = await placeService.findPlaceIdByUuid(
      changes.venuePlaceId,
      "venuePlaceId",
      { transaction },
    );
  }
  const invalidCategories = await categoryRepository.findInvalidCategoryFields(changes);
  if (invalidCategories.length)
    throw ApiError.badRequest("Unknown category", fieldErrors(invalidCategories, "Unknown option"));
  return resolved;
};

const assertUploadedImages = async (tournament, changes) => {
  if (changes.logoKey) {
    await uploadService.assertUploadedFile(
      UPLOAD_PURPOSE.TOURNAMENT_LOGO,
      tournament.uuid,
      changes.logoKey,
      "logoKey",
    );
  }
  if (changes.bannerKey) {
    await uploadService.assertUploadedFile(
      UPLOAD_PURPOSE.TOURNAMENT_BANNER,
      tournament.uuid,
      changes.bannerKey,
      "bannerKey",
    );
  }
};

const replacedImageKeys = (tournament, changes) =>
  ["logoKey", "bannerKey"]
    .filter(
      (field) => field in changes && tournament[field] && tournament[field] !== changes[field],
    )
    .map((field) => tournament[field]);

const updateTournament = async (actor, identifier, changes) => {
  const tournament = await findManageableTournament(actor, identifier);
  assertEditableFields(actor, tournament, changes);
  await assertUploadedImages(tournament, changes);

  const oldImageKeys = replacedImageKeys(tournament, changes);
  await sequelize.transaction(async (transaction) => {
    const resolved = await resolveReferences(changes, { transaction });
    const errors = findConsistencyErrors({ ...tournament.get({ plain: true }), ...resolved });
    if (errors.length) throw ApiError.badRequest("Please fix the highlighted fields", errors);
    await tournamentRepository.updateTournament(
      tournament,
      { ...resolved, updatedBy: actor.id },
      { transaction },
    );
  });

  await Promise.all(oldImageKeys.map((key) => storageService.deleteObjectQuietly(key)));
  return presentTournament(await tournamentRepository.findTournamentById(tournament.id));
};

const assertReadyForRegistration = (tournament) => {
  const missing = REQUIRED_FOR_REGISTRATION.filter(
    (field) => tournament[field] === null || tournament[field] === undefined,
  );
  if (missing.length) {
    throw ApiError.badRequest(
      "Complete these details before opening registration",
      fieldErrors(missing, "Required to open registration"),
    );
  }
  const errors = findConsistencyErrors(tournament.get({ plain: true }));
  if (errors.length) throw ApiError.badRequest("Please fix the highlighted fields", errors);
};

const changeTournamentStatus = async (actor, identifier, { status }) => {
  const tournament = await findManageableTournament(actor, identifier);
  if (!STATUS_TRANSITIONS[tournament.status].includes(status)) {
    throw ApiError.badRequest("This status change isn't allowed", [
      { field: "status", message: "Not allowed from the current status" },
    ]);
  }
  if (status === TOURNAMENT_STATUS.REGISTRATION_OPEN) assertReadyForRegistration(tournament);

  // publishedAt records the first time the tournament went public
  const publishedAt =
    tournament.publishedAt ?? (PUBLIC_STATUSES.includes(status) ? new Date() : null);
  await tournamentRepository.updateTournament(tournament, {
    status,
    publishedAt,
    updatedBy: actor.id,
  });
  return presentTournament(await tournamentRepository.findTournamentById(tournament.id));
};

const getTournament = async (viewer, identifier) =>
  presentTournament(await findViewableTournament(viewer, identifier));

const buildListFilters = ({
  status,
  tournamentFormat,
  gameFormatId,
  ageGroupId,
  genderCategoryId,
}) => ({
  ...(tournamentFormat && { tournamentFormat }),
  ...(gameFormatId && { gameFormatId }),
  ...(ageGroupId && { ageGroupId }),
  ...(genderCategoryId && { genderCategoryId }),
  ...(status && { status }),
});

const listTournamentsPage = async (query, baseFilters) => {
  const near =
    query.latitude != null && query.longitude != null
      ? {
          latitude: query.latitude,
          longitude: query.longitude,
          radiusMeters: (query.radiusKm ?? NEAR_ME.DEFAULT_RADIUS_KM) * METERS_PER_KM,
        }
      : null;
  const pagination = buildPagination(query, {
    sortableFields: SORTABLE_FIELDS,
    defaultSort: ["startDate", "asc"],
  });
  const isDistanceSort = near && !query.sortBy;

  const { rows, count } = await tournamentRepository.findTournamentsPage({
    filters: { ...buildListFilters(query), ...baseFilters },
    search: query.search,
    near,
    limit: pagination.limit,
    offset: pagination.offset,
    order: isDistanceSort ? null : pagination.order,
  });
  return {
    items: await presentTournaments(rows),
    meta: buildPaginationMeta({ ...pagination, total: count }),
  };
};

// Public list never shows drafts, whatever status filter is sent
const listPublicTournaments = (query) => {
  if (query.status && !PUBLIC_STATUSES.includes(query.status)) {
    throw ApiError.badRequest("Unknown status filter", [
      { field: "status", message: "Not a public status" },
    ]);
  }
  return listTournamentsPage(query, { status: query.status ?? { [Op.in]: PUBLIC_STATUSES } });
};

// Dashboard list: admins see all tournaments, organizers only their own
const listManagedTournaments = (actor, query) =>
  listTournamentsPage(query, isAdmin(actor) ? {} : { organizerId: actor.id });

const presentGround = (ground) => ({
  id: ground.uuid,
  name: ground.name,
  place: placeService.presentPlace(ground.place),
});

const listGrounds = async (viewer, identifier) => {
  const tournament = await findViewableTournament(viewer, identifier);
  return (await tournamentRepository.findGrounds(tournament.id)).map(presentGround);
};

const replaceGrounds = async (actor, identifier, grounds) => {
  const tournament = await findManageableTournament(actor, identifier);
  await sequelize.transaction(async (transaction) => {
    const placeIds = await placeService.findPlaceIdsByUuids(
      grounds.map((ground) => ground.placeId),
      "grounds",
      { transaction },
    );
    const resolved = grounds.map((ground) => ({
      uuid: ground.id,
      name: ground.name,
      placeId: ground.placeId ? placeIds[ground.placeId] : null,
    }));
    await tournamentRepository.syncGrounds(tournament.id, resolved, { transaction });
  });
  return (await tournamentRepository.findGrounds(tournament.id)).map(presentGround);
};

const presentTournamentRule = (row) => ({
  id: row.uuid,
  isCustom: !row.ruleId,
  masterRuleId: row.rule?.uuid ?? null,
  title: row.rule?.title ?? row.title,
  description: row.rule?.description ?? row.description,
  category: row.rule?.category ?? null,
});

const listTournamentRules = async (viewer, identifier) => {
  const tournament = await findViewableTournament(viewer, identifier);
  return (await ruleRepository.findTournamentRules(tournament.id)).map(presentTournamentRule);
};

// Order of the array is the display order; master rules are referenced, custom rules are stored
const replaceTournamentRules = async (actor, identifier, rules) => {
  const tournament = await findManageableTournament(actor, identifier);
  const masterUuids = rules.filter((rule) => rule.masterRuleId).map((rule) => rule.masterRuleId);
  const masterRules = await ruleRepository.findActiveRulesByUuids(masterUuids);
  if (masterRules.length !== new Set(masterUuids).size) {
    throw ApiError.badRequest("Unknown rule selected", [
      { field: "rules", message: "Unknown rule" },
    ]);
  }
  const masterIdByUuid = Object.fromEntries(masterRules.map((rule) => [rule.uuid, rule.id]));
  const rows = rules.map((rule) =>
    rule.masterRuleId
      ? { ruleId: masterIdByUuid[rule.masterRuleId] }
      : { title: rule.title, description: rule.description },
  );

  await sequelize.transaction((transaction) =>
    ruleRepository.replaceTournamentRules(tournament.id, rows, { transaction }),
  );
  return (await ruleRepository.findTournamentRules(tournament.id)).map(presentTournamentRule);
};

module.exports = {
  presentTournament,
  createTournament,
  updateTournament,
  changeTournamentStatus,
  getTournament,
  listPublicTournaments,
  listManagedTournaments,
  listGrounds,
  replaceGrounds,
  listTournamentRules,
  replaceTournamentRules,
};
