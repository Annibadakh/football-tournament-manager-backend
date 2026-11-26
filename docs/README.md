# Backend Docs (version-2)

This folder holds the living documentation for **v2** of the Football Tournament Manager backend:
implementation plans (temporary), feature docs, technical docs and future plans.
Read these before starting work. They are the source of context for anyone (human or AI) picking up the project.

| File | What it covers | Status |
|---|---|---|
| [01-tech-stack.md](./01-tech-stack.md) | Package versions, chosen libraries and the rules for using each one | Active |
| [02-api-response-standard.md](./02-api-response-standard.md) | Standard response envelope, error codes and pagination | Planning |
| [03-coding-standards.md](./03-coding-standards.md) | Coding philosophy, layered architecture, naming, comments | Active |
| [04-project-structure.md](./04-project-structure.md) | Target folder layout, changes, and the old→new endpoint map | Active |
| [05-business-requirements.md](./05-business-requirements.md) | Core business pillars: users and roles, tournaments, teams, payments, live | Agreed |
| [06-setup-guide.md](./06-setup-guide.md) | Environment variables, migrations check, seed data, superadmin, first data from the app | Active |
| [plans/v1-to-v2-gap-analysis.md](./plans/v1-to-v2-gap-analysis.md) | What v1 does vs what v2 needs (keep / change / new / remove) | Draft |
| [plans/implementation-plan.md](./plans/implementation-plan.md) | Build phases, draft DB schema, dependency order | Draft |
| [plans/future-feeds-and-cms.md](./plans/future-feeds-and-cms.md) | Home feeds + CMS (last phase) and the provisions earlier phases must store | Agreed |

Related frontend docs live in `football-tournament-manager-frontend/docs/`.

## Conventions for this folder
- One topic per file, prefixed with a number for reading order (`03-...md`).
- Feature docs: `features/<feature-name>.md`. Temporary implementation plans: `plans/<topic>.md`. Delete or archive a plan once it is done.
- Update the table above when adding a file.
- All v2 work is committed to the `version-2` branch.
