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
5. Start: `npm run dev`, then check `GET http://localhost:5000/api/health`.

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` / `npm start` | Run with nodemon / plain node |
| `npm test` | Vitest + Supertest |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:migrate` / `db:migrate:undo` | Apply / revert migrations |
| `npm run db:seed` / `db:reset` | Run seeders / rebuild DB from scratch |
| `npm run make:migration -- <name>` | Create a migration file |
