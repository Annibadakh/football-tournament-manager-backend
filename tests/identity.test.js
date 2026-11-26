import { createRequire } from "module";
import express from "express";
import request from "supertest";

const require = createRequire(import.meta.url);
const tokenService = require("../services/token.service");
const userRepository = require("../repositories/user.repository");
const { authenticate, requireVerified, authorize } = require("../middlewares/auth.middleware");
const { errorHandler } = require("../middlewares/error.middleware");
const { registerSchema, verifyEmailSchema } = require("../validations/auth.schema");
const { replacePositionsSchema } = require("../validations/user.schema");
const { generateNumericCode, safeEqual } = require("../utils/crypto");
const { accountSetupInvite } = require("../utils/emailTemplates");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");

describe("validation schemas", () => {
  it("normalizes email and enforces password rules", () => {
    const ok = registerSchema.safeParse({
      fullName: " Aniket ",
      email: " Aniket@Example.COM ",
      password: "Pass1234",
    });
    expect(ok.data).toEqual({
      fullName: "Aniket",
      email: "aniket@example.com",
      password: "Pass1234",
    });

    const weak = registerSchema.safeParse({
      fullName: "A B",
      email: "a@b.co",
      password: "password",
    });
    expect(weak.error.issues.map((issue) => issue.message)).toContain(
      "Password must contain a number",
    );
  });

  it("accepts only 10-digit Indian mobile numbers without +91", () => {
    expect(verifyEmailSchema.safeParse({ otp: "123456", phone: "9876543210" }).success).toBe(true);
    expect(verifyEmailSchema.safeParse({ otp: "123456", phone: "+919876543210" }).success).toBe(
      false,
    );
    expect(verifyEmailSchema.safeParse({ otp: "123456", phone: "5876543210" }).success).toBe(false);
  });

  it("requires unique positions with exactly one primary", () => {
    const valid = { positions: [{ positionId: 4, isPrimary: true }, { positionId: 3 }] };
    expect(replacePositionsSchema.safeParse(valid).success).toBe(true);
    expect(
      replacePositionsSchema.safeParse({
        positions: [{ positionId: 4 }, { positionId: 4, isPrimary: true }],
      }).success,
    ).toBe(false);
    expect(replacePositionsSchema.safeParse({ positions: [{ positionId: 4 }] }).success).toBe(
      false,
    );
    expect(replacePositionsSchema.safeParse({ positions: [] }).success).toBe(true);
  });
});

describe("crypto and email helpers", () => {
  it("generates zero-padded numeric codes", () => {
    expect(generateNumericCode(6)).toMatch(/^\d{6}$/);
  });

  it("compares in constant time and handles length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("escapes user-provided names in emails", () => {
    const email = accountSetupInvite({
      fullName: "<script>",
      inviterName: "A",
      roleLabel: "Admin",
      url: "https://x",
      ttlDays: 7,
    });
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });
});

describe("auth middleware", () => {
  const user = {
    uuid: "0b4c3a52-8f53-4b4e-9e1a-1f5d2f6f9a10",
    accountRole: ACCOUNT_ROLE.MEMBER,
    accountStatus: ACCOUNT_STATUS.VERIFIED,
  };

  const buildApp = (...middlewares) => {
    const app = express();
    app.get("/protected", ...middlewares, (req, res) => res.json({ uuid: req.user.uuid }));
    app.use(errorHandler);
    return app;
  };

  afterEach(() => vi.restoreAllMocks());

  it("rejects missing and invalid tokens", async () => {
    const app = buildApp(authenticate);
    expect((await request(app).get("/protected")).status).toBe(401);
    expect((await request(app).get("/protected").set("Authorization", "Bearer nope")).status).toBe(
      401,
    );
  });

  it("loads the user from a valid token", async () => {
    vi.spyOn(userRepository, "findUserByUuid").mockResolvedValue(user);
    const token = tokenService.signAccessToken(user);

    const res = await request(buildApp(authenticate))
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body).toEqual({ uuid: user.uuid });
  });

  it("blocks unverified users with VERIFICATION_REQUIRED and wrong roles with FORBIDDEN", async () => {
    vi.spyOn(userRepository, "findUserByUuid").mockResolvedValue({
      ...user,
      accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
    });
    const token = tokenService.signAccessToken(user);

    const unverified = await request(buildApp(authenticate, requireVerified))
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(unverified.body.code).toBe("VERIFICATION_REQUIRED");

    vi.spyOn(userRepository, "findUserByUuid").mockResolvedValue(user);
    const wrongRole = await request(buildApp(authenticate, authorize(ACCOUNT_ROLE.ADMIN)))
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(wrongRole.body.code).toBe("FORBIDDEN");
  });
});
