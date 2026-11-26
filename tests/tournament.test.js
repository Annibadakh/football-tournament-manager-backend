import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { toPlaceDetails } = require("../services/googlePlaces.service");
const { searchSamplePlaces } = require("../utils/samplePlaces");
const {
  listTournamentsQuerySchema,
  replaceGroundsSchema,
  updateTournamentSchema,
} = require("../validations/tournament.schema");
const { STATUS_TRANSITIONS, TOURNAMENT_STATUS } = require("../constants/tournament.constants");

describe("Google place details mapping", () => {
  it("maps Indian address components to our columns", () => {
    const details = toPlaceDetails({
      id: "ChIJ123",
      displayName: { text: "Sanjivani Grass Ground" },
      formattedAddress: "Sahajanandnagar, Kopargaon, Maharashtra 423601, India",
      location: { latitude: 19.8918, longitude: 74.4721 },
      types: ["stadium"],
      addressComponents: [
        { longText: "Sahajanandnagar", types: ["sublocality_level_1", "sublocality"] },
        { longText: "Kopargaon", types: ["locality"] },
        { longText: "Ahilyanagar", types: ["administrative_area_level_3"] },
        { longText: "Maharashtra", types: ["administrative_area_level_1"] },
        { longText: "423601", types: ["postal_code"] },
      ],
    });
    expect(details).toMatchObject({
      googlePlaceId: "ChIJ123",
      name: "Sanjivani Grass Ground",
      area: "Sahajanandnagar",
      city: "Kopargaon",
      district: "Ahilyanagar",
      state: "Maharashtra",
      pincode: "423601",
      latitude: 19.8918,
    });
  });
});

describe("dev sample places", () => {
  it("limits city searches to cities", () => {
    expect(searchSamplePlaces("sanjivani", { citiesOnly: true })).toEqual([]);
    expect(searchSamplePlaces("sanjivani", { citiesOnly: false })[0].googlePlaceId).toBe(
      "sample-sanjivani-ground",
    );
  });
});

describe("tournament schemas", () => {
  it("requires both coordinates for near-me", () => {
    expect(listTournamentsQuerySchema.safeParse({ latitude: "19.7" }).success).toBe(false);
    const parsed = listTournamentsQuerySchema.safeParse({
      latitude: "19.7",
      longitude: "74.4",
      radiusKm: "25",
    });
    expect(parsed.data).toMatchObject({ latitude: 19.7, longitude: 74.4, radiusKm: 25, page: 1 });
  });

  it("rejects duplicate ground names case-insensitively", () => {
    expect(
      replaceGroundsSchema.safeParse({ grounds: [{ name: "Ground A" }, { name: "ground a" }] })
        .success,
    ).toBe(false);
  });

  it("validates fee, squad sizes and contact phone", () => {
    const result = updateTournamentSchema.safeParse({
      entryFee: -1,
      minSquadSize: 2,
      contactPhone: "+919876543210",
    });
    expect(result.error.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "contactPhone",
      "entryFee",
      "minSquadSize",
    ]);
    expect(updateTournamentSchema.safeParse({ entryFee: 0 }).success).toBe(true);
  });
});

describe("status transitions", () => {
  it("allows only the agreed lifecycle", () => {
    expect(STATUS_TRANSITIONS[TOURNAMENT_STATUS.DRAFT]).toContain(
      TOURNAMENT_STATUS.REGISTRATION_OPEN,
    );
    expect(STATUS_TRANSITIONS[TOURNAMENT_STATUS.ONGOING]).not.toContain(TOURNAMENT_STATUS.DRAFT);
    expect(STATUS_TRANSITIONS[TOURNAMENT_STATUS.COMPLETED]).toEqual([]);
    expect(STATUS_TRANSITIONS[TOURNAMENT_STATUS.CANCELLED]).toEqual([]);
  });
});
