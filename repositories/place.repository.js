const { fn } = require("sequelize");
const { Place } = require("../models");

// MySQL SRID 4326 points are lat-long; values are validated numbers, passed as escaped literals
const toPointFn = (latitude, longitude) =>
  fn(
    "ST_GeomFromText",
    `POINT(${Number(latitude)} ${Number(longitude)})`,
    4326,
    "axis-order=lat-long",
  );

const PLACE_ATTRIBUTES = [
  "id",
  "uuid",
  "googlePlaceId",
  "name",
  "formattedAddress",
  "area",
  "city",
  "district",
  "state",
  "pincode",
  "latitude",
  "longitude",
];

const findPlaceByUuid = (uuid, { transaction } = {}) =>
  Place.findOne({ where: { uuid }, attributes: PLACE_ATTRIBUTES, transaction });

const findPlacesByUuids = (uuids, { transaction } = {}) =>
  Place.findAll({ where: { uuid: uuids }, attributes: ["id", "uuid"], transaction });

const findPlaceByGoogleId = (googlePlaceId) =>
  Place.findOne({ where: { googlePlaceId }, attributes: PLACE_ATTRIBUTES });

// Insert or refresh by Google place ID; location is rebuilt from lat/lng every time
const upsertPlace = async (details) => {
  const values = {
    ...details,
    location: toPointFn(details.latitude, details.longitude),
    detailsFetchedAt: new Date(),
  };
  const existing = await findPlaceByGoogleId(details.googlePlaceId);
  if (existing) {
    await Place.update(values, { where: { id: existing.id } });
  } else {
    await Place.create(values);
  }
  return findPlaceByGoogleId(details.googlePlaceId);
};

module.exports = {
  toPointFn,
  PLACE_ATTRIBUTES,
  findPlaceByUuid,
  findPlacesByUuids,
  findPlaceByGoogleId,
  upsertPlace,
};
