# Phase 6: Live streaming (module plan)

Status: **In progress** (decisions confirmed 2026-11-27). Part of `plans/implementation-plan.md`.
Goal: organizers and media operators attach YouTube streams to a tournament (opening, ceremonies, any event) and to matches (one each); the public watches them inside Maidaan, live and as replays.

## Decisions (confirmed 2026-11-27)
| Topic | Decision |
|---|---|
| Source | **YouTube links** only (phase 1). In-app streaming is a future phase |
| Levels | **Tournament streams** (many: inauguration, award ceremony, any non-match event) and **match streams** (**exactly one per match**, unique `match_id`) |
| Who | The tournament's **organizer, admins and active media operators**, and only when the admin **enabled streaming** for the tournament. Scorers don't manage streams |
| Status | **Manual**: Scheduled → **Go live** → **End**. A manager can also move a stream back (e.g. ended by mistake). `started_at` / `ended_at` are recorded |
| Link check | Server parses the URL (`youtube.com/watch?v=`, `/live/`, `/embed/`, `/shorts/`, `youtu.be/`, `m.youtube.com`) and stores the **11-character video id**. Then a **YouTube oEmbed** lookup (public, no API key) fills the title suggestion, channel name and thumbnail, and detects **embedding disabled**. If YouTube can't be reached or the video is private/not found yet, the stream is still saved and a warning is returned |
| Playback | Embedded `youtube-nocookie.com/embed/<id>` player. If embedding is disabled (or unknown and the player fails), a **Watch on YouTube** button is shown. After the event, the same video stays as the **replay** |
| Placement | **Tournament page**: a *Live now* player at the top while any stream is live, plus a **Streams** section (live, upcoming, replays). **Match page**: the match's stream above the scoreboard |
| Editing | Streams can be added before the event, edited (title, link, time) and removed later |

## Data model
`streams`:
- Identity and placement: `id`, `uuid`, `tournament_id`, `match_id` (nullable, **unique**).
- Content: `title`, `youtube_video_id`, `scheduled_at`, `status` (1 scheduled, 2 live, 3 ended).
- From oEmbed: `is_embeddable` (null = unknown), `thumbnail_url`, `channel_name`.
- Audit: `started_at`, `ended_at`, `created_by`, `updated_by`, timestamps.
- Index: `tournament_id + status`.

## API (`/api/v1`)
| Method | Path | Who / what |
|---|---|---|
| GET | `/tournaments/:id/streams` | Public: live, upcoming and ended streams (empty when streaming is off) |
| POST | `/tournaments/:id/streams` | Manager: `{ title, url, scheduledAt?, matchId? }` → stream + warnings |
| PATCH | `/streams/:id` | Manager: title, url, scheduledAt, status |
| DELETE | `/streams/:id` | Manager |
| GET | `/matches/:id` | Now includes the match's `stream` |
| GET | `/me` tournaments… | Media operators find their tournaments through the dashboard (existing staff invites) |

Config: `YOUTUBE_OEMBED_URL` (default `https://www.youtube.com/oembed`), overridable only for local tests.

## Frontend
- Tournament editor **Streams** tab (only when streaming is enabled): list, add/edit modal (link, title prefilled from YouTube, kick-off/scheduled time, optional match), Go live / End / Delete, preview.
- Media operators reach the tournament's Streams tab from their dashboard ("Tournaments I stream").
- Public: `StreamPlayer` (embed + fallback), *Live now* banner and Streams section on the tournament page, player on the match page, LIVE indicator on streams.

## Tests
Unit: URL parser (all formats, bad links), oEmbed result mapping. E2E: permissions (organizer, media operator, scorer refused, streaming disabled refused), one stream per match, status changes, oEmbed success / embedding disabled / unreachable via a local mock. Browser: add a stream, go live, public player + fallback, phone + dark mode.
