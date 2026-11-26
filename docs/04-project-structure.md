# Project Structure (Backend)

Decision: keep **layer folders** (one file per module inside each layer). API prefix: **`/api/v1`** (versioned so a future mobile app keeps working; see `02-api-response-standard.md`).
Status: target structure for v2. Existing files move into it as each module is rewritten.

```
football-tournament-manager-backend/
├── server.js                  # Entry point: checks DB connection, starts listening
├── app.js                     # Express app: security middleware, routes, 404 + error handler
├── .sequelizerc               # Points sequelize-cli at config/, migrations/, seeders/, models/
├── .env.example               # Every required env var, with dummy values
├── config/
│   ├── env.js                 # Loads dotenv once, validates with zod, exports config
│   └── database.js            # Sequelize instance
├── constants/                 # Per-module constants (see 03 › rule 7)
│   ├── common.constants.js    # Pagination defaults, upload limits, ERROR_CODES
│   ├── user.constants.js      # ROLES
│   ├── tournament.constants.js# TOURNAMENT_TYPE
│   ├── team.constants.js      # APPROVAL_STATUS
│   ├── player.constants.js    # PLAYER_POSITION
│   └── match.constants.js     # MATCH_STATUS, MATCH_STAGE, MATCH_OUTCOME, MATCH_EVENT_TYPE
├── routes/
│   ├── index.js               # Mounts every module router under /api/v1
│   └── <module>.routes.js
├── middlewares/               # Renamed from middleware/ (plural, like the other layers)
│   ├── auth.middleware.js     # authenticate + authorize(roles)
│   ├── validate.middleware.js # Common zod validation for body/params/query
│   ├── upload.middleware.js   # multer memory storage + file type/size checks
│   ├── rateLimit.middleware.js# General API and login limiters
│   └── error.middleware.js    # 404 + global error handler → standard envelope
├── controllers/<module>.controller.js
├── services/<module>.service.js
├── repositories/<module>.repository.js
├── validations/<module>.schema.js
├── models/
│   ├── index.js               # Loads models + defines associations
│   └── <Model>.model.js
├── migrations/                # Schema changes incl. indexes (sequelize-cli)
├── seeders/                   # Superadmin + demo data
├── utils/
│   ├── apiResponse.js         # sendSuccess()
│   ├── ApiError.js            # Error class with status + code
│   ├── pagination.js          # page/pageSize/sort → limit/offset/order + meta
│   └── imageProcessor.js      # sharp resize/convert to WebP
├── uploads/                   # Runtime files (gitignored, kept with .gitkeep)
└── docs/
```

**Modules:** `auth`, `user`, `tournament`, `team`, `player`, `match`, `match-event`, `upload`, `payment`.
The `dashboard` module is dropped: its only endpoint is unused (the frontend call is commented out).

## Changes from the current code
| # | Change | Reason |
|---|---|---|
| 1 | Add `services/`, `repositories/`, `validations/`, `utils/`, `constants/` | Separation of concerns (rules 3 and 9), centralized constants |
| 2 | Split `server.js` into `app.js` + `server.js`. Move `/upload-photo` into the upload module | `server.js` mixes setup, upload logic and startup |
| 3 | Move the logic in `routes/authRoutes.js` and `routes/payment.js` into controllers and services | Routes only map URLs |
| 4 | `models/index.js` with associations (Tournament→Team→Player, Match↔Team, Match→MatchPlayer/MatchEvent) | Enables `include` (no N+1) |
| 5 | `migrations/` + `seeders/` and remove `sync()` | Versioned schema and indexes |
| 6 | Rename files to `<module>.<layer>.js` and `middleware/` → `middlewares/` | Naming conventions |
| 7 | Delete `controllers.zip` and the empty `liveMatchController.js` | Dead files |
| 8 | `uploads/` gitignored with `.gitkeep`, plus `.env.example`, and commit `package-lock.json` | Reliable setup and pinned versions |

## Endpoint migration map
| Current | v2 |
|---|---|
| `POST /api/auth/login` | `POST /api/v1/auth/login` (auth is the one action-style exception) |
| `POST /api/auth/register` | `POST /api/v1/users` (superadmin creates admin/scorer users) |
| `GET /api/dashboard` | Removed |
| `GET /api/tournament/all` | `GET /api/v1/tournaments` |
| `POST /api/tournament/create-tournament` | `POST /api/v1/tournaments` |
| `POST /api/team/add-team` | `POST /api/v1/teams` |
| `GET /api/team/get-teams/:tournamentId` | `GET /api/v1/teams?tournamentId=` |
| `GET /api/team/get-team/:id` | `GET /api/v1/teams/:teamId` |
| `GET /api/team/get-captainteam/:uuid` | `GET /api/v1/teams?captainId=` (captain may read only their own) |
| `PATCH /api/team/approve/:uuid` | `PATCH /api/v1/teams/:teamId/approval` (now admin-only) |
| `POST /api/player/add-player` | `POST /api/v1/players` |
| `GET /api/player/get-players/:teamId` | `GET /api/v1/players?teamId=` |
| `GET /api/player/top-scorers` | `GET /api/v1/players?tournamentId=&sortBy=goals&sortOrder=desc&pageSize=3` |
| `GET /api/match/get-matches`, `/get-matches/:tournamentId` | `GET /api/v1/matches?tournamentId=&status=` |
| `GET /api/match/get-match/:id` | `GET /api/v1/matches/:matchId` (includes teams, players and goals in one response) |
| `POST /api/match/add-match` | `POST /api/v1/matches` |
| `POST /api/match/update-status/:id` | `PATCH /api/v1/matches/:matchId/status` |
| `POST /api/match/update-result/:id` | `PATCH /api/v1/matches/:matchId/result` |
| `POST /api/match/update-score` | `POST /api/v1/matches/:matchId/goals` |
| `GET /api/match/match-player/:matchId/:playerId` | Removed (included in `GET /api/v1/matches/:matchId`) |
| `POST /api/operations/add`, `GET /api/operations/get` | `POST` / `GET /api/v1/matches/:matchId/events` |
| `POST /api/upload-photo` | `POST /api/v1/uploads` |
| `POST /api/payment/create-order` | `POST /api/v1/payments/orders` |

The final payloads for each endpoint are designed during feature planning.
