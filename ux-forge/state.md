# XD Team Quiz v2 (Carbon) — UX Forge State

- **Folder:** C:\Users\nicla\OneDrive\XD Team Summer Gathering Quiz (exception to `~/dev/`: the project already lived here)
- **GitHub:** https://github.com/niclasolofsson1/xd-team-summer-quiz (public)
- **Branch:** `v2-carbon` (`main` = arcade version; tag `v1-arcade-summer` = as played at the Summer Gathering)
- **Push:** ask
- **Track:** Lite
- **Current version:** none yet for v2 (baseline: `v1-arcade-summer`)
- **Current phase:** L2 — Design Spec (not started)
- **Visual checks:** user
- **Wiki:** `docs/features/`

## Next session

L1 Frame is approved (`01_frame.md`). Next: **L2 Design Spec** — screens and states in Carbon for player, host and display; confirm React + `@carbon/react`; decide the open questions below; file-change plan. Read Rinkside's `docs/features/conventions.md` (Carbon section) as the starting point.

## Approvals log

| Date | Phase | Notes |
|---|---|---|
| 2026-10-15 | L1 — Frame | Includes the feature wiki (Rinkside format) |

## Open questions

- What replaces the pixel avatars.
- How tied scores are ranked.
- End the timer early when everyone has answered?
- Rejoin from a different device?
- Exact date of the Christmas party.

## Decisions worth remembering

- v2 = improved stability + Carbon UI. Christmas theme is a later, separate step on top of the Carbon base.
- Server and SSE setup stay; only the client is rebuilt.
- Both live-event bugs (name wiped on setup screen, player stuck) trace back to the client redrawing the whole screen on every update and never reopening a stale connection — see the wiki's Discrepancies section.
- The arcade theme must never be lost: tag `v1-arcade-summer` is on GitHub. To run it again, branch from the tag and deploy that branch.

## Iterations (L3)

| Date | Version | Iteration | Status |
|---|---|---|---|
