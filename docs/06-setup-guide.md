# Setup guide: environment and starting data

Use this guide to bring up a fresh Maidaan environment (local, staging or production) that is ready to use.
Order: **1 database → 2 backend `.env` → 3 seed master data → 4 superadmin → 5 frontend `.env` → 6 checks → 7 first data from the app**.

---

## 1. Database: confirm the tables came from migrations

The schema is defined **only by migrations** (`migrations/`). They create indexes and constraints that the app depends on:
- unique keys
- the spatial index on `places.location`
- the `active_lock` unique indexes (one team per player per tournament, unique jersey numbers)
- foreign keys

The app never calls `sequelize.sync()`.

Check:
```bash
npm run db:migrate:status
```
Every file should show `up`, the last one being `20261129100000-create-payments.js`. The `sequelize_meta` table should list all 11 migrations.

- **All `up`**: nothing to do.
- **Some `down`**: run `npm run db:migrate`.
- **Tables exist but `sequelize_meta` is empty or missing** (they were created another way, for example a sync or an SQL dump): the indexes above may be missing. On a database without real data, start clean:
  ```sql
  DROP DATABASE maidaan;
  CREATE DATABASE maidaan CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  ```
  then run `npm run db:migrate`.

The database must be **MySQL 8** (not MariaDB). MySQL 8 is needed for SRID 4326 points and `utf8mb4_0900_ai_ci`.

A dedicated DB user (recommended over root):
```sql
CREATE USER 'maidaan'@'%' IDENTIFIED BY '<strong password>';
GRANT ALL PRIVILEGES ON maidaan.* TO 'maidaan'@'%';
```

---

## 2. Backend `.env`

Copy `.env.example` to `.env` in the backend root. The server checks every value at start-up and lists anything missing or invalid.

### Required everywhere
| Variable | Example | How to get it |
|---|---|---|
| `NODE_ENV` | `development` / `production` | |
| `PORT` | `5000` | Port the API listens on |
| `APP_URL` | `http://localhost:5173` / `https://maidaanapp.live` | Frontend URL. Used in email links (invites, account setup) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend origins allowed to call the API |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `127.0.0.1`, `3306`, `maidaan`, `maidaan`, `…` | From step 1 |
| `JWT_ACCESS_SECRET` | 96 hex chars | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Use a different value per environment. Changing it logs everyone out |

### Required in production (optional while developing)
| Variable(s) | What happens when empty in development | Setup |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Emails (OTP codes, invites) are **printed in the server log** | Gmail: turn on 2-Step Verification for `maidaan.app@gmail.com`, create an **App Password**, then `smtp.gmail.com`, `465`, `true`, the address, the app password |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Photo/logo uploads are switched off | Private bucket in `ap-south-1` + CORS + an IAM user limited to the bucket (see the backend README, "File storage") |
| `GOOGLE_MAPS_API_KEY` | A built-in list of sample Maharashtra places is used | Google Cloud → enable **Places API (New)** → server key restricted to the API server's IP |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payment is switched off (offline recording still works) | Razorpay Dashboard → Account & Settings → API keys. Use `rzp_test_…` keys until KYC is done |
| `RAZORPAY_WEBHOOK_SECRET` | Payments are confirmed through the browser callback only | Dashboard → Webhooks → URL `https://<api>/api/v1/payments/webhook`, events `payment.captured`, `order.paid`, `payment.failed`. Razorpay can't reach `localhost` |

### Optional (defaults are fine)
| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `info` | `debug` while investigating |
| `DB_LOGGING` | `false` | `true` prints SQL |
| `JWT_ACCESS_EXPIRES_IN` / `REFRESH_TOKEN_TTL_DAYS` | `15m` / `30` | Session lengths |
| `COOKIE_SAME_SITE` | `lax` | Use `none` in production when the frontend and API are on different domains (needs HTTPS) |
| `S3_ENDPOINT` | empty | Only for local S3 emulators (MinIO). **Leave empty for AWS** |
| `S3_SIGNED_URL_TTL_SECONDS` | `3600` | Lifetime of image links |
| `CONVENIENCE_FEE_PERCENT` | `2.36` | Added to online entry-fee payments |
| `RAZORPAY_API_URL` | empty | Development/test mock only. **Must be empty in production** (start-up fails otherwise) |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | 15 min, 300, 20 | Per-IP limits |

### Example: local development
```dotenv
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=maidaan
DB_USER=maidaan
DB_PASSWORD=<your password>
JWT_ACCESS_SECRET=<generated>
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=<test secret>
```
Everything else can stay empty locally.

---

## 3. Seed master data

```bash
npm run db:seed
```
This runs three seeders once each. They are recorded in `sequelize_data`, so running the command again doesn't duplicate rows.

| Seeder | Table(s) | Rows |
|---|---|---|
| `20261126100000-positions` | `positions` | GK Goalkeeper, DEF Defender, MID Midfielder, FWD Forward / Striker |
| `20261127100000-tournament-categories` | `game_formats` | 5, 6, 7, 8, 9 and 11-a-side (players per side, default min/max squad) |
| | `age_groups` | Open, U12, U14, U16, U17, U19, U21, Veterans (35+) |
| | `gender_categories` | Men, Women, Mixed |
| `20261127100100-master-rules` | `rules` | 9 starter rules (general, match, discipline, eligibility). Admins edit them in the app (Dashboard → Rule book) |

Check:
```sql
SELECT COUNT(*) FROM positions;          -- 4
SELECT COUNT(*) FROM game_formats;       -- 6
SELECT COUNT(*) FROM age_groups;         -- 8
SELECT COUNT(*) FROM gender_categories;  -- 3
SELECT COUNT(*) FROM rules;              -- 9
SELECT name FROM sequelize_data;         -- the 3 seeders
```
Change seed data by adding a **new** seeder (`npm run make:seeder -- <name>`). Already-run seeders never run again.

**Not seeded on purpose:**
- `places` fill up as people pick locations (Google Places).
- Users, tournaments, teams and payments are created in the app.

---

## 4. Create the superadmin

```bash
npm run create:superadmin
```
It asks for full name, email and password (8+ characters, with a letter and a number). The password is hidden while you type. The account is created as **superadmin**, already verified. Run it once per environment and keep the credentials safe.

---

## 5. Frontend `.env`

In `football-tournament-manager-frontend/`, copy `.env.example` to `.env`:
```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```
This must match the backend `PORT` and include `/api/v1`. For production builds, set it to the public API URL, e.g. `https://api.maidaanapp.live/api/v1`. Vite bakes it in at build time, so rebuild after changing it.

Both `.env` files are git-ignored. Never commit them.

---

## 6. Start and check

```bash
# backend
npm run dev
# frontend (other terminal)
npm run dev
```
| Check | Expected |
|---|---|
| `GET http://localhost:5000/api/v1/health` | `"status":"ok","database":"up"` |
| `GET http://localhost:5000/api/v1/tournament-categories` | The seeded game formats, age groups and genders |
| `GET http://localhost:5000/api/v1/positions` | 4 positions |
| Open `http://localhost:5173`, log in as the superadmin | Dashboard opens |

---

## 7. First data from the app (in this order)

1. **Superadmin → Dashboard → Users → Invite account**: create an **Organizer** (name + email + role). Admins can be created the same way. They get an email (or a server-log link in development) to set their password.
2. **Admin → Tournaments → Create tournament**: name, organizer, city, streaming on/off.
3. **Organizer → the tournament → Details**: format, game format, age group, gender, dates, registration deadline, entry fee, team and squad limits, venue. Then add **Grounds** and pick the **Rule book**. Then **Open registration**.
4. **Players sign up** (email OTP + phone) and choose their positions in their profile.
5. A captain clicks **Register your team** on the tournament page. The organizer approves. For a paid tournament, the captain pays or the organizer records an offline payment. The captain then invites players, and the organizer locks the squad.

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| Start-up prints `Invalid environment configuration` | Fix the listed variables (e.g. `JWT_ACCESS_SECRET` shorter than 32 characters) |
| `ER_NOT_SUPPORTED_AUTH_MODE` / access denied | Check the DB user and password, and that the grant is on `maidaan.*` |
| `Unknown collation utf8mb4_0900_ai_ci` | The server is MariaDB or MySQL 5.x. Use MySQL 8 |
| Browser shows CORS errors | Add the exact frontend origin (scheme + host + port) to `CORS_ORIGINS` |
| Logged out on every refresh in production | Use HTTPS. When the frontend and API are on different domains, set `COOKIE_SAME_SITE=none` |
| No OTP email arrives | Without SMTP the code is in the server log. With Gmail, check the app password and `SMTP_SECURE=true` on port 465 |
| Uploads fail with a CORS error | Add the frontend origin to the S3 bucket CORS config |
| "Online payments are not set up yet" | Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then restart |
