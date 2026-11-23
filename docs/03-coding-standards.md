# Coding Philosophy & Standards (Backend)

These rules apply to every v2 change. If a rule and "clever" code conflict, the rule wins.
The same philosophy applies to the frontend (`football-tournament-manager-frontend/docs/04-coding-standards.md`).

## Philosophy
1. Readability over clever code.
2. Reusability over duplication.
3. Separation of concerns.
4. Consistent naming conventions.
5. Explicit validation and error handling.
6. Small functions with a single responsibility.
7. Centralized configurations and constants.
8. Predictable API responses.
9. Database operations separated from business logic.
10. Avoid unnecessary abstractions.

## How it applies in the backend

### 1. Readability over clever code
- Use `async/await` with early returns. No nested promise chains or callback pyramids.
- Use clear variable names over short ones (`winnerTeam`, not `wt`).

### 2. Reusability over duplication
- Shared logic goes into a middleware (auth, validation, upload), a util (response, pagination) or a service function.
- Repeated query patterns (pagination, sorting, search) go through a single helper in `utils/`.

### 3 & 9. Separation of concerns: request flow
```
route → middleware (auth, rateLimit, validate) → controller → service → repository → model
```
| Layer | Responsibility | Must NOT |
|---|---|---|
| `routes/` | Map URL + method to middleware and controller | Contain logic |
| `middlewares/` | Cross-cutting checks: auth, role, validation, upload, rate limit, errors | Contain business rules |
| `controllers/` | Read the request, call the service, send the response with `sendSuccess` | Query the DB or hold business rules |
| `services/` | **Business logic**: points calculation, match state rules, approval flow, transactions | Use `req`/`res` or write raw Sequelize queries |
| `repositories/` | **All database operations** (Sequelize queries) for one model | Contain business decisions |
| `models/` | Sequelize model definitions and associations | Contain logic |
| `validations/` | zod schemas for `body`, `params` and `query` (backend-owned, not shared with the frontend) | Hit the DB |
| `utils/` | Pure helpers: `apiResponse`, `ApiError`, pagination, image processing | Depend on `req`/`res` |
| `config/` | env, DB, constants | |

Multi-step writes (for example ending a match and then updating team points) run inside a **Sequelize transaction** started in the service.

### 4. Naming conventions
| Thing | Convention | Example |
|---|---|---|
| Files | `<entity>.<layer>.js` | `team.controller.js`, `team.service.js`, `team.repository.js`, `team.schema.js`, `team.routes.js` |
| Models | PascalCase singular | `Team`, `MatchPlayer` |
| DB tables / columns | snake_case plural tables, snake_case columns (via Sequelize `underscored: true`) | `match_players.player_id` |
| Functions | camelCase, verb-first | `createTeam`, `findTeamByUuid` |
| Repository functions | `find*`, `create*`, `update*`, `delete*`, `count*` | `findMatchesByTournament` |
| Constants | UPPER_SNAKE_CASE | `ROLES.ADMIN`, `MATCH_STATUS.ENDED` |
| Routes | kebab-case plural resources (RESTful) | `GET /api/v1/teams/:teamId/players` |
| Env vars | UPPER_SNAKE_CASE | `JWT_EXPIRES_IN` |

### 5. Explicit validation & error handling
- Every route with input has a `validate(schema)` middleware. Controllers receive data that is already validated.
- Throw `ApiError(status, code, message)` for expected failures, for example `NOT_FOUND` when a record is missing. Never let `null.property` crash.
- One global error handler formats every error. Unknown errors are logged and return `INTERNAL_ERROR` with no stack trace or raw DB error.
- Always `await` saves and queries. Fire-and-forget DB calls are not allowed.

### 6. Small functions, single responsibility
- Aim for functions under ~30 lines. A controller handler is usually 3–8 lines.
- One function does one thing. Split work such as "calculate result" and "award points" into separate functions.

### 7. Centralized configuration & constants
- `config/env.js` loads dotenv **once**, validates the required env vars with zod at startup, and exports a typed config object. Nothing else reads `process.env`.
- `config/constants.js` holds roles, match statuses, stages, outcomes, pagination defaults and upload limits.
- Points come from the tournament settings (`pointsWin/Draw/Loss`), never hard-coded `3`/`1`.

### 8. Predictable API responses
- Use only `sendSuccess(...)` and `ApiError` (see 02). Never call `res.json({...})` with an ad-hoc shape.

### 10. Avoid unnecessary abstractions
- No generic `BaseRepository`/`BaseService` classes. Write plain functions per entity.
- Do not add a layer, util or package until it solves a real, repeated problem.
- The repository layer is the one deliberate abstraction (rule 9). Keep it thin, with one function per query.

## Comments
Comments are **short, meaningful, one line**. They explain **why** (or a non-obvious *what*), never repeat the code.

```js
// Lock both teams so concurrent goal updates can't double-count
const transaction = await sequelize.transaction();

// Tie gives both teams draw points from tournament settings
await awardPoints([team1Id, team2Id], tournament.pointsDraw, transaction);
```
Avoid:
```js
// find the team
const team = await findTeamByUuid(uuid);
```
- No commented-out code blocks. Git keeps the history.
- `// TODO:` must say what is left to do.

## Tooling (to be set up)
- ESLint plus Prettier. Database **migrations** with sequelize-cli instead of tables created by hand or `sync()`.
