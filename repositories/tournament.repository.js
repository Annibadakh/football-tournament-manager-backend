const { escapeLike } = require("../utils/sql");
const { Op, col, fn, where: sqlWhere } = require("sequelize");
const {
  AgeGroup,
  GameFormat,
  GenderCategory,
  Place,
  Tournament,
  TournamentGround,
  User,
} = require("../models");
const { PLACE_ATTRIBUTES, toPointFn } = require("./place.repository");

const CATEGORY_ATTRIBUTES = ["id", "code", "name"];

const DETAIL_INCLUDES = [
  { model: User, as: "organizer", attributes: ["id", "uuid", "fullName", "photoKey"] },
  { model: Place, as: "city", attributes: PLACE_ATTRIBUTES },
  { model: Place, as: "venue", attributes: PLACE_ATTRIBUTES },
  { model: GameFormat, as: "gameFormat", attributes: [...CATEGORY_ATTRIBUTES, "playersPerSide"] },
  { model: AgeGroup, as: "ageGroup", attributes: CATEGORY_ATTRIBUTES },
  { model: GenderCategory, as: "genderCategory", attributes: CATEGORY_ATTRIBUTES },
];

const findTournamentByUuidOrSlug = (identifier, { transaction, withDetails = true } = {}) =>
  Tournament.findOne({
    where: { [Op.or]: [{ uuid: identifier }, { slug: identifier }] },
    include: withDetails ? DETAIL_INCLUDES : [],
    transaction,
  });

const findTournamentById = (id, { transaction } = {}) =>
  Tournament.findByPk(id, { include: DETAIL_INCLUDES, transaction });

const createTournament = (data, { transaction } = {}) => Tournament.create(data, { transaction });

const updateTournament = (tournament, changes, { transaction } = {}) =>
  tournament.update(changes, { transaction });

const isSlugTaken = async (slug) =>
  (await Tournament.count({ where: { slug }, paranoid: false })) > 0;

// Name, venue, area, city or district match the search text
const buildSearchCondition = (search) => {
  const term = `%${escapeLike(search)}%`;
  return {
    [Op.or]: [
      { name: { [Op.like]: term } },
      { "$venue.name$": { [Op.like]: term } },
      { "$venue.area$": { [Op.like]: term } },
      { "$city.city$": { [Op.like]: term } },
      { "$city.name$": { [Op.like]: term } },
      { "$city.district$": { [Op.like]: term } },
    ],
  };
};

/**
 * Paged tournament list used by the public listing and dashboards.
 * near = { latitude, longitude, radiusMeters } adds a distance filter on the venue and a `distanceMeters` column.
 */
const findTournamentsPage = async ({ filters, search, near, limit, offset, order }) => {
  const conditions = [filters];
  if (search) conditions.push(buildSearchCondition(search));

  const attributes = { include: [] };
  if (near) {
    const distance = fn(
      "ST_Distance_Sphere",
      col("venue.location"),
      toPointFn(near.latitude, near.longitude),
    );
    attributes.include.push([distance, "distanceMeters"]);
    conditions.push(sqlWhere(distance, { [Op.lte]: near.radiusMeters }));
  }

  return Tournament.findAndCountAll({
    where: { [Op.and]: conditions },
    attributes,
    include: DETAIL_INCLUDES,
    limit,
    offset,
    order: near && !order ? [[col("distanceMeters"), "ASC"]] : order,
    subQuery: false,
    distinct: true,
  });
};

const findGrounds = (tournamentId, { transaction } = {}) =>
  TournamentGround.findAll({
    where: { tournamentId },
    include: [{ model: Place, as: "place", attributes: PLACE_ATTRIBUTES }],
    order: [["sortOrder", "ASC"]],
    transaction,
  });

// Keeps existing ground rows (matches will reference them in Phase 5), adds new ones, removes missing ones
const syncGrounds = async (tournamentId, grounds, { transaction }) => {
  const existing = await TournamentGround.findAll({ where: { tournamentId }, transaction });
  const keptUuids = grounds.filter((ground) => ground.uuid).map((ground) => ground.uuid);
  const toDelete = existing
    .filter((ground) => !keptUuids.includes(ground.uuid))
    .map((ground) => ground.id);
  if (toDelete.length) await TournamentGround.destroy({ where: { id: toDelete }, transaction });

  // Temporarily rename kept rows so swapping names between grounds can't hit the unique index
  for (const ground of existing.filter((row) => keptUuids.includes(row.uuid))) {
    await ground.update({ name: `~${ground.uuid}` }, { transaction });
  }

  for (const [index, ground] of grounds.entries()) {
    const values = { name: ground.name, placeId: ground.placeId, sortOrder: index + 1 };
    if (ground.uuid)
      await TournamentGround.update(values, {
        where: { uuid: ground.uuid, tournamentId },
        transaction,
      });
    else await TournamentGround.create({ ...values, tournamentId }, { transaction });
  }
};

module.exports = {
  findTournamentByUuidOrSlug,
  findTournamentById,
  createTournament,
  updateTournament,
  isSlugTaken,
  findTournamentsPage,
  findGrounds,
  syncGrounds,
};
