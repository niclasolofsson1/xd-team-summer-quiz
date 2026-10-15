# XD Team Quiz v2 (Carbon) — UX Forge State

- **Folder:** C:\Users\nicla\OneDrive\XD Team Summer Gathering Quiz (exception to `~/dev/`: the project already lived here)
- **GitHub:** https://github.com/niclasolofsson1/xd-team-summer-quiz (public)
- **Branch:** `v2-carbon` (`main` = arcade version; tag `v1-arcade-summer` = as played at the Summer Gathering)
- **Push:** ask
- **Track:** Lite
- **Current version:** none yet for v2 (baseline: `v1-arcade-summer`)
- **Current phase:** L3 — Build (next: v1.1.0, not started)
- **Visual checks:** user
- **Wiki:** `docs/features/`

## Next session

L1 Frame and L2 Design Spec are approved (`01_frame.md`, `02_design_spec.md`). Next: **L3 Build, v1.1.0 — server hardening** (section 6 of the spec) with server tests and the 25-player simulation. Read `02_design_spec.md` sections 6–10 and the wiki pages the change touches; not the whole repo.

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
- Hosting stays on Render (one long-running process holds the state; Vercel's serverless model doesn't fit).
- Both live-event bugs (name wiped on setup screen, player stuck) trace back to the client redrawing the whole screen on every update and never reopening a stale connection — see the wiki's Discrepancies section.
- The arcade theme must never be lost: tag `v1-arcade-summer` is on GitHub. To run it again, branch from the tag and deploy that branch.

## Iterations (L3)

| Date | Version | Iteration | Status |
|---|---|---|---|
