# Conventions

Rules for the code. All three apps are Carbon since v1.4.0 (player v1.2.0, host v1.3.0, big screen v1.4.0); the arcade client was removed and is preserved in tag `v1-arcade-summer`.

## Carbon apps (v2)

- **Stack:** Vite + React 19 + `@carbon/react` 1.x + Sass. Source in `client/`, one HTML page per app (`client/participant.html`, `client/host.html`, `client/display.html`), built to `dist/` with `npm run build`. Built files go to `dist/app/`; `client/public/` (the favicon at `assets/favicon.svg`) is copied to `dist/` as it is. The server serves `dist/` only.
- **Layout:** `client/src/shared/` (logic and parts used by all apps: `liveConnection.js`, `useQuizState.js`, `api.js`, `answer.js`, `clock.js`, `format.js`, `podium.js`, `storage.js`, `avatars.json`, `components/`), `client/src/<app>/` (`App.jsx`, `main.jsx`, `screens/`, the app's stylesheet).
- **Plain logic stays out of React** (connection, retries, clock, formatting, podium layout) so it's unit-tested in Node (`tests/unit/`, Vitest).
- **Real Carbon components only** where Carbon has one (Header, Button, TextInput, TileGroup/RadioTile, InlineNotification, ActionableNotification, InlineLoading, ProgressBar, StructuredList, Tag; host: OverflowMenu, Modal, Select). Own parts: answer tile, avatar, podium, countdown number, players list rows.
- **Shared parts' styles** (avatar, timer bar, answer tile, leaderboard, podium) live in `client/src/styles/shared-components.scss`, imported by every app; each app's own stylesheet only has its layout.
- **Themes:** White (phones), g10 (host), g100 (big screen). Quiz colours (answers A–D and their tints) live only in `client/src/styles/quiz-tokens.scss`, so a themed version swaps that file.
- **Only the Carbon component styles the apps use** are compiled (`client/src/styles/main.scss`). A new Carbon component needs its `@use '@carbon/react/scss/components/…'` line there, or in the app's own stylesheet when only that app uses it (the host's modal, overflow menu, select, popover and tooltip are in `host.scss`, with the same `config` settings), so the phones' stylesheet doesn't grow.
- **Font:** IBM Plex Sans 300/400/600, Latin-1 files from `@ibm/plex`, bundled by Vite (`$css--font-face: false`, no CDN).
- **Text fields at 16 px or more (v1.2.5):** iOS Safari zooms the page in on focus for smaller text and doesn't zoom back. `main.scss` raises Carbon's inputs to `body-02`. Never fix it with `maximum-scale=1`, which blocks pinch-zoom.
- **Spacing tokens only:** 4 / 8 / 12 / 16 / 24 / 32 / 48 (`$sp-*` in `quiz-tokens.scss`).
- **Focus ring for keyboard users only (v1.2.4, Rinkside's pattern):** a block in `main.scss` removes Carbon's `:focus` / `:active` ring when the focus isn't keyboard focus (`:not(:focus-visible)`), prefixed with `html` to beat Carbon's selectors. Radio tiles are covered through their hidden input (`.cds--tile-input:focus + .cds--tile`). Text fields keep their ring (browsers always count them as keyboard focus). Own parts use `:focus-visible`. A new Carbon part with its own `:focus` ring goes in that list (`tests/e2e/player.spec.js`, "focus ring only for keyboard users").
- **Host keys (v1.3.0):** → / PageDown / Space press the host's primary button (`client/src/host/clicker.js`): debounced 1 s, never while typing, in a dialog or a menu; Space is left to a focused button or link. Host actions are sent once, never retried automatically.
- **Host layout (v1.3.1):** Carbon's 2x Grid. From 1024 px a main area (10 of 16 columns) and one control column (6), 32 px gutters, panels filling the screen height; below 1024 px they stack; no sideways scroll from 360 px. One primary button per screen, fluid across the control column (xl, label left, arrow right; the label is centred vertically, the one override on Carbon). A temporarily disabled primary stays visible with a line saying what unlocks it. Settings use Select, not ContentSwitcher (Carbon keeps that for switching views). The header is Carbon's "header only" pattern: title, connection, ⋮ menu. Mockup: `ux-forge/mockups/v1.3.1-host.html`.
- **Notifications and status colours (v1.3.2):** an InlineNotification gets a short title (the first sentence) and a subtitle (the rest), split with `splitMessage` in `format.js`; the words stay as approved. Status colours (`$support-*`) go on icons, never on text: text stays `$text-primary` or `$text-secondary` so it passes AA. Mockup: `ux-forge/mockups/v1.3.2-player.html`.
- **Big screen (v1.4.0):** g100 theme, 16:9, never scrolls. 1 rem = 1/45 of the screen height (or 1/80 of the width), so 16 px at 1280×720 and 24 px at 1920×1080; the big screen's layout and its sizes of the shared parts are in rem in `display.scss` (the shared parts stay px for phones). Nothing is clickable, so no focus rings. On the reveal, answers that recede are dark tiles with a strip of their colour on the left (the phones' light tints would outshine the right answer on a dark screen). What fits (24 players on the wall in 3 columns, long names on two lines; 9 standings rows) is fixed in `displayView.js`, because everything scales together. Mockup: `ux-forge/mockups/v1.4.0-display.html`.
- **Accessibility:** colour is never the only cue (answers keep their letter, marks are written out); phase changes are announced in a polite live region; the timer isn't read out; `prefers-reduced-motion` turns off the countdown pop, reveal slides and the big screen's confetti; tap targets ≥ 48 px, answer tiles ≥ 72 px.
- **Copy** comes from `ux-forge/02_design_spec.md` section 5.
- **Browser storage:** `localStorage` `xd-quiz-player` (id, token, name) and `xd-quiz-last-name`; `sessionStorage` `xd-quiz-answer-<id>-<question>` and, on the host, `xd-summer-quiz-host-pin`. Every access is wrapped in try/catch.
- **Tests:** `npm test` (server + unit), `npm run test:e2e` (Playwright, reduced motion by default: player at phone size, host at 1280×800, big screen at 1280×720 and 1920×1080 with a no-scroll check per phase), `npm run simulate`.

## Server

- `server.js` plus `lan-address.js` (which laptop address phones get). Plain Node (`http`, `fs`, `crypto`, `os`), no frameworks or dependencies.

## Copy

- Friendly and short, English only.

## Git and releases

- `main` = the arcade version. Tag `v1-arcade-summer` = exactly as played at the Summer Gathering (on GitHub).
- v2 work happens on `v2-carbon`. From the first v2 build, one version = one commit + a `CHANGELOG.md` entry + a tag `vX.Y.Z`. Push only with the user's say-so.
- When a change alters a feature, update its page in `docs/features/` in the same commit.
