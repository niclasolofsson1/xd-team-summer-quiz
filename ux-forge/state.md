# XD Team Quiz v2 (Carbon) — UX Forge State

- **Folder:** C:\Users\nicla\OneDrive\XD Team Summer Gathering Quiz (exception to `~/dev/`: the project already lived here)
- **GitHub:** https://github.com/niclasolofsson1/xd-team-summer-quiz (public)
- **Branch:** `v2-carbon` (`main` = arcade version; tag `v1-arcade-summer` = as played at the Summer Gathering)
- **Push:** ask
- **Track:** Lite
- **Current version:** v1.4.0 (Carbon big screen)
- **Current phase:** L3 — Build (next: v1.5.0 stability pass, not started; waits for the user's go)
- **Visual checks:** user
- **Wiki:** `docs/features/`

## Next session

v1.4.0 (Carbon big screen) is built from a hi-fi mockup the user approved (`ux-forge/mockups/v1.4.0-display.html`, two rounds): g100, rem layout where 1 rem = 1/45 of the height (16 px at 720p, 24 px at 1080p), never scrolls (e2e checks every phase at both sizes). User's calls in the mockup: **looping CSS confetti** on the champion (option B, made to keep falling instead of one burst); on the reveal only a **left colour strip** on the dimmed dark tiles (no pick-share bars at the bottom — they read as a stray L-shaped border; the picks number is enough); "14 of 22 answered" and the "Reconnecting…" tag in the top bar accepted. Join address fix: `lan-address.js` prefers 192.168 / 10 / 172.16–31 over 100.64/10 (Tailscale) and link-local. `public/` removed; favicon now `client/public/assets/favicon.svg`; the server serves `dist/` only. Waiting for the user's projector/TV check.

**Idea parked (user, 2026-11-14):** the user likes the dark (g100) theme a lot and wants to consider it for the player app too. Not decided; look at it later (with v1.6.0's look, or as its own mockup), user decides.

Next: **v1.5.0 — stability pass** (spec section 9), only after the user's go.

v1.3.2 (player polish) is built from a read-only Carbon audit of the player app and a static mockup the user approved (`ux-forge/mockups/v1.3.2-player.html`): "Answer locked" in text-primary with only the check icon green (user's option B; the green text failed AA at 3.35:1), notifications split into a short title (first sentence) and subtitle via `splitMessage` in `format.js`, visually hidden Rank / Player / Score column headers on the leaderboard, and the player chip inside `HeaderGlobalBar` with no `href` on `HeaderName`. The user's phone check passed.

v1.3.3 (clearer reveal, bigger question) follows the user's feedback on the reveal ("stacks too weirdly", double border) and a hi-fi mockup they approved (`ux-forge/mockups/v1.3.3-player.html`, served from `dist/mockups/` for the phone): one row per reveal tile (letter | answer + Carbon tags | picks column), green "✓ Correct" tag, white "You" tag (outline tag without its stroke, user's call), the blue pick stroke kept as one line with no white gap (option B), question in heading-04 with a step-down to heading-03 over 90 characters. Only the player reveal changed (`reveal` prop on AnswerTile); the host reveal is unchanged. The user's check on iPhone 16 and iPhone 18 Pro Max passed ("looks good", resizes well per phone).

v1.3.1 (host redesign) is done; the user's laptop check passed ("This is good. Much better."). The v1.3.0 host looked broken to the user ("looks awful"), so the host app was redone from Carbon's own guidance (via the Carbon MCP): 2x Grid with a main area (10/16) and one control column (6/16) filling the screen; join address first with Copy link and a player wall (empty state before anyone joins); Carbon Select instead of content switchers; low-contrast test-set note; one fluid xl primary button per screen (label left, arrow right, label centred vertically — the one override); a temporarily disabled primary stays visible with a line saying what unlocks it (Carbon's disabled-state rule); "header only" global header (title, connection, ⋮). Mockup approved by the user first: `ux-forge/mockups/v1.3.1-host.html`. Behaviour unchanged (PIN gate, clicker, send-once, private preview, Reset modal).

Lessons (still apply): the trimmed Carbon stylesheet needs `scss/layout` (size tokens); for visual work, make a static mockup from the Carbon MCP guidance and get the user's approval before building.

**Checkpoint rule (user's guardrail):** one version per session. After each version, stop and report (changes, tests run, what to check visually). Never start the next version without the user's explicit go. Check plan usage before starting a version; the user wants no extra-usage spend.

## Approvals log

| Date | Phase | Notes |
|---|---|---|
| 2026-10-15 | L1 — Frame | Includes the feature wiki (Rinkside format) |
| 2026-10-15 | L2 — Design Spec | Full scope kept; releases v1.1.0–v1.5.0, then v2.0.0 |

## Open questions

- Exact date of the Christmas party.
- Render plan: make sure it doesn't sleep during the event.
- Before the v2.0.0 deploy on Render: build command `npm install && npm run build`, no `NODE_ENV=production` at install, `HOST_PIN` set, `PUBLIC_URL=https://xd-team-summer-quiz.onrender.com`, auto-deploy branch `main`. Hosting is Render, not Vercel.

## Decisions worth remembering

- v2 = improved stability + Carbon UI. Christmas look is v1.6.0 (cosmetic assets, avatar polish, winter/Christmas effects), added by the user 2026-11-13, after the v1.5.0 stability pass and before the v2.0.0 merge. Mockup first; re-run all tests and the simulation at its end; the rehearsal happens after v1.6.0. Scope: player app and big screen only — the host app stays as it is (user, 2026-11-13). v1.6.0 also revisits the start moment: the arcade "Press to start" screen was merged into Join in v1.2.0 (faster joining); the user wants something similar back once most is built — mockup both a festive Join header and a separate splash, user decides.
- Server and SSE setup stay; only the client is rebuilt (Vite + React 19 + @carbon/react).
- L2 decisions: emoji avatars; ties broken by faster total correct-answer time, then shared rank; timer ends early when everyone answered; rejoin by name only for a disconnected player.
- Font: IBM Plex Sans (self-hosted, as in Rinkside) — replaces the L1 note about overriding it.
- Versions: arcade = v1; v2 work is v1.1.0–v1.6.0; v2.0.0 (merge to main) needs the user's explicit go after the rehearsal.
- Hosting stays on Render (one long-running process holds the state; Vercel's serverless model doesn't fit). Since v1.2.0 Render's build command must be `npm install && npm run build` (to change in the Render dashboard by the user before the next deploy).
- v1.2.3 (user's call): no confetti on phones, medals 🥇🥈🥉 instead; deviates from L2 "CSS-only confetti at the champion stage". v1.4.0 (user's call): the big screen keeps confetti, looping while the champion is shown.
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
| 2026-11-12 | v1.3.0 | Carbon host app (spec section 3 Host); user's decisions: remove `public/host.html`, no auto-retry of host actions, clicker rules, primary disabled during countdown/answering | Done; user's laptop check failed ("looks awful") → v1.3.1 |
| 2026-11-12 | v1.3.1 | Host redesign from Carbon MCP guidance; static mockup approved first; disabled Start stays visible with a hint (Carbon rule, user accepted with the mockup) | Done; user's laptop check passed |
| 2026-11-13 | v1.3.2 | Player polish from the Carbon audit: "Answer locked" contrast (option B), notification title + subtitle, hidden leaderboard column headers, chip in HeaderGlobalBar; mockup approved first | Done; user's phone check passed |
| 2026-11-13 | v1.3.3 | Reveal tiles in one row with Carbon tags and a picks column; blue pick stroke without the white gap (option B); white borderless "You" tag; question heading-04 (heading-03 over 90 characters); hi-fi mockup approved first | Done; user's iPhone check passed |
| 2026-11-14 | v1.4.0 | Carbon big screen (g100, QR from `/api/join-info`, no scroll at 720p/1080p, looping confetti); join address prefers Wi-Fi over VPN; `public/` removed; hi-fi mockup approved first (2 rounds) | Done; waiting for the user's projector/TV check |
