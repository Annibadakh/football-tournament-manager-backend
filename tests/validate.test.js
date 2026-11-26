import { createRequire } from "module";
import express from "express";
import request from "supertest";
import { z } from "zod";

const require = createRequire(import.meta.url);
const { validate } = require("../middlewares/validate.middleware");
const { errorHandler } = require("../middlewares/error.middleware");
const { paginationQuerySchema } = require("../validations/common.schema");

// Minimal app exercising validate() the way module routes will use it
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/teams/:teamId",
    validate({
      params: z.object({ teamId: z.coerce.number().int().positive() }),
      query: paginationQuerySchema,
      body: z.object({ teamName: z.string().min(2, "Team name is required") }),
    }),
    (req, res) => res.json(req.validated),
  );
  app.use(errorHandler);
  return app;
};

describe("validate middleware", () => {
  it("passes parsed and coerced values on req.validated", async () => {
    const res = await request(buildApp())
      .post("/teams/7?page=2")
      .send({ teamName: "Shirdi United" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      params: { teamId: 7 },
      query: { page: 2, pageSize: 10 },
      body: { teamName: "Shirdi United" },
    });
  });

  it("collects field errors from every request part", async () => {
    const res = await request(buildApp()).post("/teams/abc?pageSize=500").send({ teamName: "" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.errors.map((error) => error.field)).toEqual(["teamId", "pageSize", "teamName"]);
  });
});
