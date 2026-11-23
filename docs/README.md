# Backend Docs (version-2)

This folder holds the living documentation for **v2** of the Football Tournament Manager backend:
implementation plans (temporary), feature docs, technical docs and future plans.
Read these before starting work. They are the source of context for anyone (human or AI) picking up the project.

| File | What it covers | Status |
|---|---|---|
| [01-tech-stack.md](./01-tech-stack.md) | Package versions, chosen libraries and the rules for using each one | Active |
| [02-api-response-standard.md](./02-api-response-standard.md) | Standard response envelope, error codes and pagination | Planning |
| [03-coding-standards.md](./03-coding-standards.md) | Coding philosophy, layered architecture, naming, comments | Active |

Related frontend docs live in `football-tournament-manager-frontend/docs/`.

## Conventions for this folder
- One topic per file, prefixed with a number for reading order (`03-...md`).
- Feature docs: `features/<feature-name>.md`. Temporary implementation plans: `plans/<topic>.md`. Delete or archive a plan once it is done.
- Update the table above when adding a file.
- All v2 work is committed to the `version-2` branch.
