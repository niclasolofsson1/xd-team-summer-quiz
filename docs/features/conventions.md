# Conventions

Rules for the arcade version (v1). v2 replaces the UI conventions with Carbon ones, set in L2.

## Code layout

- **Server:** `server.js` only. Plain Node (`http`, `fs`, `crypto`), no frameworks or dependencies.
- **Client:** one `public/app.js` for all three views. Each HTML page sets `<body data-view="participant | host | display">` and `app.js` branches on it (`render`).
- **Screens are functions that return HTML strings** and are written into `#app` with `innerHTML`. Event handlers are bound after each render (`bind…` functions).
- **All user-entered text goes through `escapeHtml`** (names, question text, options).

## Styling

- One stylesheet, `public/styles.css` (~3,600 lines), hand-written.
- Pixel-arcade look: `pixel-frame` borders, background images per screen, fonts **Nunito Black** and **Silkscreen Bold** (`public/assets/fonts/`).
- The `<html>` and `<body>` get a class per player screen (`welcome-active`, `question-active`, …) via `updateScreenBodyClass`, for full-bleed backgrounds.
- Breakpoints: 760/761 px (phone vs larger) and 900 px. `prefers-reduced-motion` turns off the animations.
- Light colour scheme only.

## Assets

- Images are served as **WebP**; the PNG originals are still in the repo but unused (Discrepancies 14).
- Big images for the next screen are preloaded while the current one shows.

## Copy

- Friendly and short: "Get ready", "Time is up", "Waiting for host", "The roadtrip is complete".
- English only.

## Storage in the browser

- `localStorage`: the player id (`xd-summer-quiz-participant-id`).
- `sessionStorage`: the host PIN (`xd-summer-quiz-host-pin`) and the chosen answer per question (`xd-summer-quiz-answer-<id>-<question>`).

## Git and releases

- `main` = the arcade version. Tag `v1-arcade-summer` = exactly as played at the Summer Gathering (on GitHub).
- v2 work happens on `v2-carbon`. From the first v2 build, one version = one commit + a `CHANGELOG.md` entry + a tag `vX.Y.Z`. Push only with the user's say-so.
- When a change alters a feature, update its page in `docs/features/` in the same commit.
