const config = require("../config/env");
const googlePlaces = require("./googlePlaces.service");
const placeRepository = require("../repositories/place.repository");
const ApiError = require("../utils/ApiError");
const { searchSamplePlaces, getSamplePlaceDetails } = require("../utils/samplePlaces");
const { PLACE_SEARCH_TYPE } = require("../constants/place.constants");

// Without a key (local development) a built-in sample of Maharashtra places is used
const useSamplePlaces = () => !config.googleMapsApiKey && !config.isProduction;

const presentPlace = (place) =>
  place && {
    id: place.uuid,
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    formattedAddress: place.formattedAddress,
    area: place.area,
    city: place.city,
    district: place.district,
    state: place.state,
    pincode: place.pincode,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };

const searchPlaces = ({ query, type, sessionToken }) => {
  const citiesOnly = type === PLACE_SEARCH_TYPE.CITY;
  if (useSamplePlaces()) return searchSamplePlaces(query, { citiesOnly });
  return googlePlaces.autocomplete(query, { citiesOnly, sessionToken });
};

// Details always come from Google server-side; coordinates sent by clients are never trusted
const resolvePlace = async ({ googlePlaceId, sessionToken }) => {
  const details = useSamplePlaces()
    ? getSamplePlaceDetails(googlePlaceId)
    : await googlePlaces.getPlaceDetails(googlePlaceId, { sessionToken });
  if (!details || details.latitude == null) throw ApiError.notFound("Place not found");
  return presentPlace(await placeRepository.upsertPlace(details));
};

// Turns a place uuid from a request body into the internal id, or a field error
const findPlaceIdByUuid = async (placeUuid, field, { transaction } = {}) => {
  if (placeUuid === null) return null;
  const place = await placeRepository.findPlaceByUuid(placeUuid, { transaction });
  if (!place)
    throw ApiError.badRequest("Unknown place", [
      { field, message: "Select a place from the suggestions" },
    ]);
  return place.id;
};

// Batch version for lists (e.g. grounds): one query, returns { uuid: id }
const findPlaceIdsByUuids = async (placeUuids, field, { transaction } = {}) => {
  const uniqueUuids = [...new Set(placeUuids.filter(Boolean))];
  if (!uniqueUuids.length) return {};
  const places = await placeRepository.findPlacesByUuids(uniqueUuids, { transaction });
  if (places.length !== uniqueUuids.length) {
    throw ApiError.badRequest("Unknown place", [
      { field, message: "Select a place from the suggestions" },
    ]);
  }
  return Object.fromEntries(places.map((place) => [place.uuid, place.id]));
};

module.exports = {
  presentPlace,
  searchPlaces,
  resolvePlace,
  findPlaceIdByUuid,
  findPlaceIdsByUuids,
};
