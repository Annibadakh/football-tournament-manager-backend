# Tech Stack & Library Rules (Backend)

Status: packages installed on `version-2` (2026-11-23). The new libraries are **installed only**. They are not wired into the code yet,
except for the `bcryptjs` → `bcrypt` swap.

Runtime: Node.js 22 LTS (CommonJS).

## Core versions

| Package | Old | New | Notes |
|---|---|---|---|
| express | 4.21 | **5.3.x** | Major upgrade, see notes below |
| sequelize | 6.37.6 | 6.37.8 | v7 is still alpha, so we stay on v6 |
| mysql2 | 3.13 | 3.24.x | |
| dotenv | 16.4 | 18.0.x | Logs an `injected env` line on load. Use `config({ quiet: true })` when we centralize config |
| multer | 1.4.5-lts | 2.5.x | |
| jsonwebtoken | 9.0.2 | 9.0.3 | |
| razorpay | 2.9.6 | 2.9.8 | |
| cors | 2.8.5 | 2.8.6 | |
| nodemon (dev) | 3.1.9 | 3.1.14 | |

Removed (unused or replaced): `bcryptjs` (now `bcrypt`), `body-parser` (built into Express), `file-type`, `moment-timezone`.

### Express 5 notes
- An async handler that throws or rejects is now forwarded to the error middleware automatically. A global error handler (planned) catches it.
- Wildcard routes need names: `/*splat` instead of `*`. Optional segments use `{/:param}`.
- `req.body` is `undefined` (not `{}`) when no body parser runs. `req.query` is read-only.
- Smoke-tested: the server boots, routes and auth middleware respond, and unknown routes return 404.

## New libraries and how we use them

| Concern | Library | Rule |
|---|---|---|
| Security headers | **helmet** | `app.use(helmet())` early in `server.js`. Configure `crossOriginResourcePolicy` so the frontend can still load `/uploads` images. |
| Rate limiting | **express-rate-limit** | A general limiter on `/api`, plus a strict limiter on `/api/auth/login` and other sensitive routes. Responses use the standard envelope with code `RATE_LIMITED`. |
| Password hashing | **bcrypt** | `bcrypt.hash(password, 12)` / `bcrypt.compare`. Already swapped in. Existing `$2a$` hashes from bcryptjs still verify. |
| Authentication | **jsonwebtoken** | Access token signed with `JWT_SECRET`, with payload `{ uuid, role }` and a configurable expiry. Verified in `authenticate(roles)` middleware. |
| Image processing | **sharp** | Every uploaded image (team logo, player photo, tournament logo) is resized, converted to WebP and compressed before it is saved. Multer keeps the file in memory and sharp writes it to `uploads/`. |
| Validation | (to decide) | Recommend sharing **zod** with the frontend for request-body validation middleware. |
