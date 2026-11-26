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
| `config/` | env loading and the DB connection | Hold business constants |
| `constants/` | Per-module constants and enums (`match.constants.js`, …) | Import from services, models or other layers |

Multi-step writes (for example ending a match and then updating team points) run inside a **Sequelize transaction** started in the service.

### 4. Naming conventions
| Element | Convention | Example |
|---|---|---|
| Folders | kebab-case | `team-management/` |
| Files | camelCase or kebab-case, with a dotted layer suffix | `team.service.js`, `matchUtils.js` |
| Variables | camelCase | `teamId` |
| Functions | camelCase | `createTeam()` |
| Classes | PascalCase | `TeamService`, `ApiError` |
| Constants | UPPER_SNAKE_CASE | `MAX_TEAM_SIZE` |
| Database tables | snake_case | `tournament_teams` |
| Database columns | snake_case | `created_at` |
| API endpoints | kebab-case, plural resource nouns | `/api/team-members` |
| Boolean variables | `is` / `has` / `can` prefix | `isActive` |
| Layer files | `<module>.<layer>.js` | `match.controller.js`, `match.service.js`, `match.repository.js`, `match.schema.js`, `match.routes.js` |
| Models | PascalCase singular | `Team`, `MatchPlayer` |

#### Function naming
Names must say **what** the function does and **to what**. No generic names.

| Avoid | Prefer |
|---|---|
| `getData()` | `getTournamentDetails()` |
| `processData()` | `calculateMatchPoints()` |
| `update()` | `updateTeamDetails()` |
| `check()` | `isRegistrationOpen()` |
| `handle()` | `handleMatchCompletion()` |

**Use verbs consistently:**
| Verb | Meaning | Example |
|---|---|---|
| `get` | Retrieve data (by id, or a list) | `getMatchById()`, `getTeamsByTournament()` |
| `find` | Search for a record that may not exist | `findUserByEmail()` |
| `create` | Create a record | `createTournament()` |
| `update` | Modify a record | `updateMatchStatus()` |
| `delete` | Delete a record | `deletePlayer()` |
| `is` / `has` | Boolean checks | `isMatchLive()`, `hasPaidEntryFee()` |
| `calculate` | Perform calculations | `calculateGoalDifference()` |
| `validate` | Validate data | `validateMatchSchedule()` |

#### REST API endpoints
Each module has **one router and one controller**. The HTTP method expresses the action, so URLs contain **no verbs**
(no `/add-match`, `/edit-match` or `/get-matches`).

| Method | Endpoint | Action | Controller fn |
|---|---|---|---|
| GET | `/api/matches` | List (supports `page`, `pageSize`, `sortBy`, `sortOrder`, `search`, filters) | `getMatches` |
| GET | `/api/matches/:matchId` | Get one | `getMatchById` |
| POST | `/api/matches` | Create | `createMatch` |
| PATCH | `/api/matches/:matchId` | Partial update | `updateMatchDetails` |
| DELETE | `/api/matches/:matchId` | Delete | `deleteMatch` |

- Filter with query params instead of new paths: `GET /api/matches?tournamentId=…&status=started`.
- Child resources are nested at most one level deep: `GET /api/teams/:teamId/players`.
- A state change that is not a plain field edit becomes a sub-resource noun, not a verb: `PATCH /api/matches/:matchId/status`, `PATCH /api/teams/:teamId/approval`, `POST /api/matches/:matchId/goals`.
- Path params are named `<resource>Id` (`matchId`, not `id`).


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
- Constants are **centralized per module**: one file per module in `constants/`, for example `match.constants.js`, `team.constants.js`, `user.constants.js`, plus `common.constants.js` for cross-module values. Never define a status or role inline in a controller, service, model or schema.
- Enumerations use **numeric codes**, frozen and grouped in one object. Always compare against the constant, never a raw number or string:
```js
// Numeric codes are stored in the DB; never compare against raw numbers
const MATCH_STATUS = Object.freeze({
  SCHEDULED: 1,
  LIVE: 2,
  COMPLETED: 3,
  CANCELLED: 4,
});

if (match.status === MATCH_STATUS.COMPLETED) {
  // ...
}
```
- **DB storage:** enum columns are `TINYINT` holding the numeric code, never a MySQL `ENUM` of strings. Models and migrations read their allowed values from the constant (`validate: { isIn: [Object.values(MATCH_STATUS)] }`).
- **Validation:** zod schemas use the same constant, for example `z.enum(MATCH_STATUS)` (zod 4 accepts enum-like objects).
- **API:** responses send the numeric code. The frontend keeps the same codes in its own constants and maps them to labels.
- Cross-module values (pagination defaults, upload limits, `ERROR_CODES`) go in `common.constants.js`.
- Points come from the tournament settings (`pointsWin/Draw/Loss`), never hard-coded `3`/`1`.

### 8. Predictable API responses
- Use only `sendSuccess(...)` and `ApiError` (see 02). Never call `res.json({...})` with an ad-hoc shape.

### 10. Avoid unnecessary abstractions
- No generic `BaseRepository`/`BaseService` classes. Write plain functions per entity.
- Do not add a layer, util or package until it solves a real, repeated problem.
- The repository layer is the one deliberate abstraction (rule 9). Keep it thin, with one function per query.

## Async code
- Use **async/await everywhere**. Do not mix in `.then()` chains or callbacks. Callback-only APIs are wrapped with `util.promisify` or replaced with their promise versions (`fs/promises`).
- Express 5 forwards rejected promises to the error handler, so handlers do not need `try/catch` just to call `next(err)`. Use `try/catch` only when you handle or translate the error.
- Run independent awaits in parallel with `Promise.all`. Keep awaits sequential only when one depends on the other.

## Validation middleware
- One common middleware, `middlewares/validate.js`: `validate({ body, params, query })` takes zod schemas, parses each part, and fails with `VALIDATION_ERROR` plus field errors.
- Controllers read the **parsed** values from `req.validated.{body,params,query}` (Express 5 makes `req.query` read-only), never `req.body` directly. Services receive (with coercion, defaults and unknown keys stripped), never the raw `req.body`.
- No manual `if (!field)` checks in controllers.

## Database rules
| Rule | How |
|---|---|
| **No raw SQL** | Use Sequelize model methods (`findAll`, `findOne`, `create`, `update`, `increment`, `count`…) and `Op` operators. If a raw query is ever unavoidable, it needs review and must use `replacements`/`bind` parameters. Never use string interpolation. |
| **Transactions for dependent writes** | Any operation that changes more than one row or table that depends on another (for example ending a match plus awarding points, recording a goal plus updating match, team and player totals, or creating a captain user plus a team) runs in `sequelize.transaction(async (t) => { ... })`. The service owns the transaction and passes `{ transaction: t }` to every repository call. |
| **Atomic counters** | Use `Model.increment()` / `decrement()` for scores and points instead of read-modify-save, to avoid race conditions. |
| **Indexes** | Add an index to every foreign key and to columns used often in `where`/`order` (for example `matches.tournament_id`, `matches.status`, `matches.start_date`, `teams.tournament_id`, `players.team_id`, `match_players (match_id, player_id)` unique, and `users.email` unique). Indexes are defined in migrations, and each new query is checked for one. |
| **Select only needed columns** | Always pass `attributes` for lists and joins. Never return `password` (it is excluded by default through a model `defaultScope`). Use `raw: true` for read-only lists when model instances aren't needed. |
| **Avoid N+1** | Never query inside a loop. Load related data with `include` (eager loading) using associations, or batch it with `where: { id: { [Op.in]: ids } }` and map the results in memory. Example: a match plus its two teams plus their players is one query with `include`, not 1 + 2 + 2 + N calls. |
| **Paginate lists** | Every list endpoint uses `limit`/`offset` (or `findAndCountAll`) with a max `pageSize`. Never return an unbounded `findAll()` to the client. |

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
