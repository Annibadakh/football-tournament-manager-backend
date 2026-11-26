# API Response Standard (Planning)

Every endpoint returns the same envelope, so the frontend can use one central wrapper (see frontend `docs/03-api-response-handling.md`).

## Envelope

```jsonc
// success
{ "success": true, "message": "Team created", "data": { ... } }

// success, paginated list
{ "success": true, "message": "Teams fetched", "data": [ ... ],
  "meta": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }

// error
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR",
  "errors": [{ "field": "teamName", "message": "Team name is required" }] }
```

## Error codes ↔ HTTP status
| code | status |
|---|---|
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| RATE_LIMITED | 429 |
| INTERNAL_ERROR | 500 (never leak stack traces or raw Sequelize errors) |

## Planned helpers
- `utils/apiResponse.js`: `sendSuccess(res, { data, message, meta, status = 200 })`.
- `utils/ApiError.js`: `throw new ApiError(404, "NOT_FOUND", "Team not found")`.
- `middleware/errorHandler.js`: a global handler that turns `ApiError`, validation errors and unknown errors into the envelope.

## List query parameters (server-side tables)
`page` (default 1), `pageSize` (default 10, max 100), `sortBy` (whitelisted columns), `sortOrder` (`asc|desc`), `search`, plus endpoint-specific filters.
These map to Sequelize `limit`/`offset`/`order`/`where` and match TanStack Table's server-side mode on the frontend.

## Client compatibility (web now, mobile app later)
The API serves the React web app now and a **mobile app (Android/iOS) in a future version**. Every endpoint must work for both without changes:

| Rule | Why it matters for the app |
|---|---|
| JSON only, same envelope everywhere. No HTML responses or server redirects | Apps parse JSON. Redirects break native HTTP clients |
| Business logic lives in the API, never only in the web UI | The app must enforce the same rules without duplicating them |
| Auth works **with or without cookies**: web keeps the refresh token in an httpOnly cookie, the app sends it in the request body and stores it in secure storage. The access token is always `Authorization: Bearer` | Native apps don't share browser cookies |
| The client identifies itself with `X-Client-Platform: web \| android \| ios` and `X-App-Version` | Analytics, platform-specific behaviour, forcing an update on old apps |
| `GET /api/app-config` (later): minimum supported app version, feature flags | Lets us tell old app versions to update |
| Timestamps in **ISO 8601 UTC** (`2026-11-26T06:00:00.000Z`). The client formats them for local time | Same parsing on every platform |
| Image and file URLs are **absolute** URLs | Apps have no "current origin" to resolve relative paths |
| Stable machine-readable `code` on every error, plus field-level `errors` | The app can show its own translated messages |
| Lists are always paginated with `meta` | Infinite scroll on mobile |
| Resource ids in URLs are public `uuid`s or slugs | Deep links (`maidaanapp.live/players/<uuid>` opens in the app) |
| Uploads use `multipart/form-data` with size and type limits | Same flow from camera or gallery |
| Payments: the same create-order + server-side verification endpoints work with the Razorpay web checkout and mobile SDKs | One payment flow |
| Changes are **backward compatible**: add fields, never rename or remove fields without a deprecation period | Users don't update apps immediately |
| Push notifications (later): a `user_devices` table stores device tokens per user | In-app notifications extend to push |
