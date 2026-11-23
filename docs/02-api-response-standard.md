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
