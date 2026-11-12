# XD Team Quiz v2 (Carbon) — UX Forge State

- **Folder:** C:\Users\nicla\OneDrive\XD Team Summer Gathering Quiz (exception to `~/dev/`: the project already lived here)
- **GitHub:** https://github.com/niclasolofsson1/xd-team-summer-quiz (public)
- **Branch:** `v2-carbon` (`main` = arcade version; tag `v1-arcade-summer` = as played at the Summer Gathering)
- **Push:** ask
- **Track:** Lite
- **Current version:** v1.3.0 (Carbon host app)
- **Current phase:** L3 — Build (next: v1.4.0 big screen, not started; waits for the user's go)
- **Visual checks:** user
- **Wiki:** `docs/features/`

## Next session

v1.3.0 (Carbon host app) is done, waiting for the user's laptop check: g10 theme, PIN gate, header (phase, question set, connection, ⋮ → Reset with a danger modal), stage panel with one primary button per step, players panel, lobby setup and join link with Copy, test-set warning, private final preview, clicker keys (→ / PageDown / Space, debounced 1 s). Host actions are sent once, never auto-retried. Shared component styles moved to `client/src/styles/shared-components.scss`; host-only Carbon styles are in `host.scss` (phone CSS unchanged). `public/host.html` removed; `public/` now only serves the arcade big screen. Tests: `npm test` (server + unit), `npm run test:e2e` (player + host), `npm run simulate`.

Next: **v1.4.0 — big-screen app** (g100, QR from `/api/join-info`, never scrolls at 1280×720; decide the champion celebration, since phones use medals instead of confetti), then remove `public/` (the favicon at `public/assets/favicon.svg` must move to `client/public/` or similar). Read `02_design_spec.md`, the Carbon section of `conventions.md` and the big-screen wiki pages; reuse `client/src/shared/`. Carry over the approved v1.2.x decisions (keyboard-only focus, Carbon-blue pick, smooth timer, medals, 16 px inputs). Lesson: the trimmed Carbon stylesheet needs `scss/layout` (size tokens); `main.scss` lists it.

**Checkpoint rule (user's guardrail):** one version per session. After each version, stop and report (changes, tests run, what to check visually). Never start the next version without the user's explicit go. Check plan usage before starting a version; the user wants no extra-usage spend.

## Approvals log

| Date | Phase | Notes |
|---|---|---|
| 2026-10-15 | L1 — Frame | Includes the feature wiki (Rinkside format) |
| 2026-10-15 | L2 — Design Spec | Full scope kept; releases v1.1.0–v1.5.0, then v2.0.0 |

## Open questions

- Exact date of the Christmas party.
- Render plan: make sure it doesn't sleep during the event.

## Decisions worth remembering

- v2 = improved stability + Carbon UI. Christmas theme is a later, separate step on top of the Carbon base.
- Server and SSE setup stay; only the client is rebuilt (Vite + React 19 + @carbon/react).
- L2 decisions: emoji avatars; ties broken by faster total correct-answer time, then shared rank; timer ends early when everyone answered; rejoin by name only for a disconnected player.
- Font: IBM Plex Sans (self-hosted, as in Rinkside) — replaces the L1 note about overriding it.
- Versions: arcade = v1; v2 work is v1.1.0–v1.5.0; v2.0.0 (merge to main) needs the user's explicit go after the rehearsal.
- Hosting stays on Render (one long-running process holds the state; Vercel's serverless model doesn't fit). Since v1.2.0 Render's build command must be `npm install && npm run build` (to change in the Render dashboard by the user before the next deploy).
- v1.2.3 (user's call): no confetti on phones, medals 🥇🥈🥉 instead; deviates from L2 "CSS-only confetti at the champion stage". Big-screen celebration to be decided in v1.4.0.
- v1.2.0: Carbon's Sass compiles under Vite 8 (spec risk cleared). Only the used Carbon component styles are compiled (CSS 28 KB gzipped).
- Both live-event bugs (name wiped on setup screen, player stuck) trace back to the client redrawing the whole screen on every update and never reopening a stale connection — see the wiki's Discrepancies section.
- The arcade theme must never be lost: tag `v1-arcade-summer` is on GitHub. To run it again, branch from the tag and deploy that branch.

## Iterations (L3)

| Date | Version | Iteration | Status |
|---|---|---|---|
| 2026-10-15 | v1.1.0 | Server hardening (spec section 6, items 1–9), server tests, 25-player simulation | Done |
| 2026-11-06 | v1.2.0 | Build setup, Carbon foundation, live-state hook, player app; unit + e2e tests | Done |
| 2026-11-06 | v1.2.1 | Fix: Carbon layout tokens missing (buttons/inputs 19 px tall); size e2e test | Done |
| 2026-11-06 | v1.2.2 | Answer text centred vertically; readable tinted tiles on the reveal; name field 48 px | Done |
| 2026-11-06 | v1.2.3 | Reveal without green stroke (wrong pick tinted + dashed); confetti removed; medals on the podium | Done |
| 2026-11-06 | v1.2.4 | Focus ring for keyboard users only (Rinkside pattern, incl. radio tiles) | Done |
| 2026-11-06 | v1.2.5 | Text inputs at 16 px (no iOS focus zoom) | Done |
| 2026-11-06 | v1.2.6 | One "your pick" style: solid Carbon blue stroke on question, Time's up and reveal | Done |
| 2026-11-06 | v1.2.7 | Timer bar drains with one linear CSS animation | Done |
| 2026-11-06 | v1.2.8 | Podium: "You" tag instead of a blue frame; reveal sequence (3 steps) kept, user confirmed | Done; user's phone check passed ("smooth and nice, very Carbon") |
| 2026-11-12 | v1.3.0 | Carbon host app (spec section 3 Host); user's decisions: remove `public/host.html`, no auto-retry of host actions, clicker rules, primary disabled during countdown/answering | Done; laptop check by the user pending |
