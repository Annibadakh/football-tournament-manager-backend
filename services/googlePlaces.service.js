const config = require("../config/env");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");
const { GOOGLE_PLACES } = require("../constants/place.constants");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const unavailableError = () =>
  new ApiError(
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    "Location search is unavailable. Please try again.",
  );

// All Google calls go through here: server key, timeout, and no Google errors leaking to clients
const callGoogle = async (path, { method = "GET", body, fieldMask, query } = {}) => {
  const url = new URL(`${GOOGLE_PLACES.BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => value && url.searchParams.set(key, value));

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.googleMapsApiKey,
        ...(fieldMask && { "X-Goog-FieldMask": fieldMask }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(GOOGLE_PLACES.TIMEOUT_MS),
    });
  } catch (err) {
    logger.error({ err }, "Google Places request failed");
    throw unavailableError();
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    logger.error(
      { status: response.status, body: await response.text() },
      "Google Places error response",
    );
    throw unavailableError();
  }
  return response.json();
};

const autocomplete = async (query, { citiesOnly, sessionToken }) => {
  const data = await callGoogle("/places:autocomplete", {
    method: "POST",
    body: {
      input: query,
      sessionToken,
      includedRegionCodes: [GOOGLE_PLACES.REGION],
      languageCode: GOOGLE_PLACES.LANGUAGE,
      ...(citiesOnly && { includedPrimaryTypes: GOOGLE_PLACES.CITY_TYPES }),
    },
  });
  return (data?.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      googlePlaceId: prediction.placeId,
      primaryText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text,
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
    }));
};

const findComponent = (components, ...types) =>
  types.map((type) => components.find((component) => component.types?.includes(type))).find(Boolean)
    ?.longText ?? null;

// Maps Google's address components to our columns (Indian addresses: level_3 is usually the district)
const toPlaceDetails = (place) => {
  const components = place.addressComponents ?? [];
  return {
    googlePlaceId: place.id,
    name: place.displayName?.text ?? place.formattedAddress,
    formattedAddress: place.formattedAddress ?? null,
    area: findComponent(components, "sublocality_level_1", "sublocality", "neighborhood"),
    city: findComponent(components, "locality", "administrative_area_level_3"),
    district: findComponent(
      components,
      "administrative_area_level_3",
      "administrative_area_level_2",
    ),
    state: findComponent(components, "administrative_area_level_1"),
    pincode: findComponent(components, "postal_code"),
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    types: place.types ?? [],
  };
};

const getPlaceDetails = async (googlePlaceId, { sessionToken }) => {
  const place = await callGoogle(`/places/${encodeURIComponent(googlePlaceId)}`, {
    fieldMask: GOOGLE_PLACES.DETAILS_FIELD_MASK,
    query: { sessionToken, languageCode: GOOGLE_PLACES.LANGUAGE },
  });
  return place ? toPlaceDetails(place) : null;
};

module.exports = { autocomplete, getPlaceDetails, toPlaceDetails };
