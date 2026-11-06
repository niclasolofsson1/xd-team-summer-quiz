# Conventions

Rules for the code. The **Carbon apps** (player since v1.2.0) follow the first section; the **arcade** host and big screen (until v1.3.0 / v1.4.0) the rest.

## Carbon apps (v2)

- **Stack:** Vite + React 19 + `@carbon/react` 1.x + Sass. Source in `client/`, one HTML page per app (`client/participant.html`), built to `dist/` with `npm run build`. Built files go to `dist/app/`.
- **Layout:** `client/src/shared/` (logic and parts used by all apps: `liveConnection.js`, `useQuizState.js`, `api.js`, `answer.js`, `clock.js`, `format.js`, `podium.js`, `storage.js`, `avatars.json`, `components/`), `client/src/<app>/` (`App.jsx`, `main.jsx`, `screens/`, the app's stylesheet).
- **Plain logic stays out of React** (connection, retries, clock, formatting, podium layout) so it's unit-tested in Node (`tests/unit/`, Vitest).
- **Real Carbon components only** where Carbon has one (Header, Button, TextInput, TileGroup/RadioTile, InlineNotification, ActionableNotification, InlineLoading, ProgressBar, StructuredList). Own parts: answer tile, avatar, podium, countdown number.
- **Themes:** White (phones), g10 (host), g100 (big screen). Quiz colours (answers A–D, confetti) live only in `client/src/styles/quiz-tokens.scss`, so a themed version swaps that file.
- **Only the Carbon component styles the apps use** are compiled (`client/src/styles/main.scss`). A new Carbon component needs its `@use '@carbon/react/scss/components/…'` line there.
- **Font:** IBM Plex Sans 300/400/600, Latin-1 files from `@ibm/plex`, bundled by Vite (`$css--font-face: false`, no CDN).
- **Spacing tokens only:** 4 / 8 / 12 / 16 / 24 / 32 / 48 (`$sp-*` in `quiz-tokens.scss`).
- **Focus ring for keyboard users only:** a block in `main.scss` removes Carbon's `:focus` ring when the focus isn't keyboard focus (`:not(:focus-visible)`). Own parts use `:focus-visible`. A new Carbon part with its own `:focus` ring goes in that list.
- **Accessibility:** colour is never the only cue (answers keep their letter, marks are written out); phase changes are announced in a polite live region; the timer isn't read out; `prefers-reduced-motion` turns off the countdown pop, reveal slide and confetti; tap targets ≥ 48 px, answer tiles ≥ 72 px.
- **Copy** comes from `ux-forge/02_design_spec.md` section 5.
- **Browser storage:** `localStorage` `xd-quiz-player` (id, token, name) and `xd-quiz-last-name`; `sessionStorage` `xd-quiz-answer-<id>-<question>`. Every access is wrapped in try/catch.
- **Tests:** `npm test` (server + unit), `npm run test:e2e` (Playwright, phone-sized, reduced motion), `npm run simulate`.

## Code layout (arcade)

- **Server:** `server.js` only. Plain Node (`http`, `fs`, `crypto`), no frameworks or dependencies.
- **Client (arcade):** one `public/app.js` for the host and big screen (the player page moved to the Carbon app in v1.2.0). Each HTML page sets `<body data-view="participant | host | display">` and `app.js` branches on it (`render`).
- **Screens are functions that return HTML strings** and are written into `#app` with `innerHTML`. Event handlers are bound after each render (`bind…` functions).
- **All user-entered text goes through `escapeHtml`** (names, question text, options).

## Styling (arcade)

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

## Storage in the browser (arcade)

- `sessionStorage`: the host PIN (`xd-summer-quiz-host-pin`).

## Git and releases

- `main` = the arcade version. Tag `v1-arcade-summer` = exactly as played at the Summer Gathering (on GitHub).
- v2 work happens on `v2-carbon`. From the first v2 build, one version = one commit + a `CHANGELOG.md` entry + a tag `vX.Y.Z`. Push only with the user's say-so.
- When a change alters a feature, update its page in `docs/features/` in the same commit.
