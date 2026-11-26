# Maidaan Backend

REST API for the Maidaan football tournament platform (Node 22, Express 5, Sequelize + MySQL).
Project documentation lives in [`docs/`](./docs/README.md).

## Setup
1. Install Node 22 (`.nvmrc`) and MySQL 8.
2. Create a database, for example `CREATE DATABASE maidaan;`
3. Copy `.env.example` to `.env` and fill in the DB credentials.
4. Install and prepare:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
5. Create the first superadmin: `npm run create:superadmin` (prompts for name, email, password).
6. Start: `npm run dev`, then check `GET http://localhost:5000/api/v1/health`.

Without SMTP settings, emails (OTP codes, invite links) are printed to the server log, so the whole sign-up flow works locally.

## Email (Gmail SMTP)
1. Turn on 2-Step Verification for `maidaan.app@gmail.com`.
2. Create an **App Password** (Google Account → Security → App passwords).
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=maidaan.app@gmail.com`, `SMTP_PASS=<app password>`.

Gmail allows about 500 emails per day. To switch provider later, change only the SMTP variables.

## File storage (AWS S3)
1. Create a **private** bucket in `ap-south-1` (Block all public access: on).
2. Add this CORS configuration so browsers can upload with presigned POST and read with signed URLs:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:5173", "https://maidaanapp.live"],
       "AllowedMethods": ["POST", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
3. Create an IAM user (or role) limited to the bucket with `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`, and set its keys in `.env`.
4. Set `AWS_S3_BUCKET` and `AWS_REGION`.

## Locations (Google Places)
1. In Google Cloud, enable billing and the **Places API (New)**.
2. Create an API key restricted to the **Places API** and to your server's IP address.
3. Set `GOOGLE_MAPS_API_KEY` in `.env`.

The frontend never calls Google directly: it uses `GET /api/v1/places/autocomplete` and `POST /api/v1/places` on this API, so there is no browser key. Without a key in development, a small built-in list of Maharashtra places (Kopargaon, Shirdi, Pune, Mumbai, grounds…) is used.

## Payments (Razorpay)
1. In the Razorpay Dashboard (Test mode first), go to **Account & Settings → API keys** and generate a key. Put the key id and secret in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. **Account & Settings → Payment capture**: keep **automatic capture** on.
3. **Webhooks → Add new webhook**: URL `https://<api-domain>/api/v1/payments/webhook`, a secret of your choice (put it in `RAZORPAY_WEBHOOK_SECRET`), events `payment.captured`, `order.paid`, `payment.failed`. Razorpay can't reach `localhost`. In development, the checkout callback alone confirms payments.
4. `CONVENIENCE_FEE_PERCENT` (default 2.36) is added to every online entry-fee payment and rounded up to the whole rupee.

Without keys, online payment is switched off and organizers can still record offline payments. Switch to live keys only after Razorpay activates the account (KYC).

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` / `npm start` | Run with nodemon / plain node |
| `npm test` | Vitest + Supertest |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:migrate` / `db:migrate:undo` | Apply / revert migrations |
| `npm run db:seed` / `db:reset` | Run seeders / rebuild DB from scratch |
| `npm run make:migration -- <name>` | Create a migration file |
| `npm run create:superadmin` | Create the first superadmin account |
