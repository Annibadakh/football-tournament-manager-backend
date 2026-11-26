import { createRequire } from "module";
import request from "supertest";

// Load app and repository through Node's require so spies hit the same module instances
const require = createRequire(import.meta.url);
const app = require("../app");
const healthRepository = require("../repositories/health.repository");

describe("GET /api/v1/health", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the success envelope when the database is up", async () => {
    vi.spyOn(healthRepository, "pingDatabase").mockResolvedValue();

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok", database: "up" } });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("returns SERVICE_UNAVAILABLE when the database is down", async () => {
    vi.spyOn(healthRepository, "pingDatabase").mockRejectedValue(new Error("down"));

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      message: "Database is not reachable",
      code: "SERVICE_UNAVAILABLE",
    });
  });
});

describe("error handling", () => {
  it("returns NOT_FOUND envelope for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: "NOT_FOUND" });
  });

  it("returns VALIDATION_ERROR for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/health")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Malformed JSON body",
    });
  });
});
