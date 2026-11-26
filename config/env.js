const dotenv = require("dotenv");
const { z } = require("zod");

// Load .env once for the whole app; real env vars take precedence
dotenv.config({ quiet: true });

// "true"/"false" env strings → booleans, with a per-variable default
const booleanFlag = (defaultValue) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(""),
  DB_LOGGING: booleanFlag(false),

  APP_URL: z.url().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: booleanFlag(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Maidaan <maidaan.app@gmail.com>"),

  AWS_REGION: z.string().default("ap-south-1"),
  AWS_S3_BUCKET: z.string().optional(),
  // Only for local emulators (MinIO/moto); leave empty for real AWS
  S3_ENDPOINT: z.url().optional(),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  GOOGLE_MAPS_API_KEY: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

// Email and file storage are optional while developing, mandatory in production
const productionSchema = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;
  ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "AWS_S3_BUCKET", "GOOGLE_MAPS_API_KEY"].forEach((key) => {
    if (!env[key])
      ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
  });
});

// Empty values from .env (e.g. "S3_ENDPOINT=") mean "not set", not an empty string
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
);

const parsed = productionSchema.safeParse(rawEnv);

// Fail fast with a readable list instead of crashing later on undefined config
if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  console.error(`Invalid environment configuration:\n${problems.join("\n")}`);
  process.exit(1);
}

const env = parsed.data;

const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  logLevel: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  corsOrigins: env.CORS_ORIGINS,
  db: Object.freeze({
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    logging: env.DB_LOGGING,
  }),
  appUrl: env.APP_URL.replace(/\/$/, ""),
  auth: Object.freeze({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    cookieSameSite: env.COOKIE_SAME_SITE,
    cookieSecure: env.NODE_ENV === "production" || env.COOKIE_SAME_SITE === "none",
  }),
  mail: Object.freeze({
    isConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  }),
  storage: Object.freeze({
    isConfigured: Boolean(env.AWS_S3_BUCKET),
    region: env.AWS_REGION,
    bucket: env.AWS_S3_BUCKET,
    endpoint: env.S3_ENDPOINT,
    signedUrlTtlSeconds: env.S3_SIGNED_URL_TTL_SECONDS,
  }),
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
  rateLimit: Object.freeze({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  }),
});

module.exports = config;
