// Autocomplete scopes; CITY limits suggestions to towns/cities (player city, tournament city)
const PLACE_SEARCH_TYPE = Object.freeze({
  ANY: "any",
  CITY: "city",
});

const GOOGLE_PLACES = Object.freeze({
  BASE_URL: "https://places.googleapis.com/v1",
  TIMEOUT_MS: 5000,
  REGION: "in",
  LANGUAGE: "en",
  CITY_TYPES: ["locality", "administrative_area_level_3"],
  DETAILS_FIELD_MASK: "id,displayName,formattedAddress,addressComponents,location,types",
});

const PLACE_RULES = Object.freeze({
  QUERY_MIN: 2,
  QUERY_MAX: 100,
});

module.exports = { PLACE_SEARCH_TYPE, GOOGLE_PLACES, PLACE_RULES };
