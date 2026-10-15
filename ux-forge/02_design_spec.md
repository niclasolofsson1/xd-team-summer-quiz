# L2 Design Spec: XD Team Quiz v2 (Carbon)

Approved 2026-10-15 (Lite track). Builds on `01_frame.md`.

## 1. Summary

The browser side is rebuilt in **React + Carbon** as three small apps (player, host, big screen), served by the **existing `server.js`**, which gets targeted stability and fairness fixes. The game flow stays exactly as described in `docs/features/`. Shipped in five versions, each usable on its own, then `v2.0.0` for the party.

## 2. Decisions on the open questions

| Question | Decision | Why |
|---|---|---|
| **Avatars** | **Emoji on coloured circles**, 12 choices (🦊 🐼 🐸 🦉 🐙 🦁 🐧 🐨 🐯 🐻 🐰 🐮), from one data file so a Christmas set (🎅 🦌 ⛄) can be swapped in later. | No art needed, readable at any size, fun. Emoji look slightly different per OS — acceptable. |
| **Ties** | Equal scores are separated by **faster total answer time on correct answers**. If that's also equal (in practice only players on 0), they **share a rank** ("=5th"). | Points already reward speed, so true ties are rare; the champion is never split. |
| **End timer early** | **Yes.** When every joined player has answered, the answer window closes. The host still triggers the reveal. | No waiting; host keeps the pace. |
| **Rejoin from another device** | **Yes, by name.** Entering the exact name of a player who is **disconnected** takes over that player, score included. If that player is still connected: "That name is in use". New players still can't join mid-quiz. | Covers a dead battery or closed browser without allowing a takeover of someone still playing. |

## 3. UX structure

### Player (phone, Carbon White theme)

Welcome and setup are **merged into one Join screen** to keep joining under 30 seconds.

| Screen | Content | States |
|---|---|---|
| **Join** | Title, name field, avatar grid, **Join** | Empty name, name taken, quiz already started (with rejoin hint), sending |
| **Lobby** | "You're in, {name}!", avatar, "Waiting for the host to start.", players joined | — |
| **Countdown** | "Question 3 of 25", large 3-2-1 | — |
| **Question** | Question text, 4 answer tiles (letter + colour + text), timer bar with seconds | Choosing → **Sending…** → **Answer locked** (only after server confirmation) → send failed ("Couldn't send your answer. Tap again.") |
| **Time's up** | "Time's up!", "Waiting for the host to reveal the answer.", your locked answer | — |
| **Reveal** | Result banner (**Correct! +850** / **Not this time** / **No answer**), correct tile marked, your tile marked, count per option | — |
| **Leaderboard** | Your rank + score card, top 10, your own row pinned if outside the top 10 | — |
| **Final** | Stage 0 locked → 4th and down → 3rd → champion and runner-up (podium 2-1-3) | Your own placement highlighted |

**On every screen after joining:** a connection banner — hidden when connected, "Reconnecting…" after a short drop, "Connection lost." **Retry** if reconnecting fails. After a reset the player returns to Join with "The quiz was reset. Join again to play."

### Host (laptop, Carbon g10 theme)

- **Header:** "XD Team Quiz", phase tag, question set tag, connection status, overflow menu with **Reset** (Carbon danger modal to confirm).
- **Left, stage panel:** what's happening now plus **one large primary button** for the next step (same steps as today: Start → Reveal answer → Show leaderboard / Reveal final results → Next question → final reveal stages, with the private podium preview).
- **Right, players panel:** per player avatar, name, **connected dot**, **answered check** during questions, score. Summary line, e.g. "18 of 20 answered · 2 offline".
- **Lobby:** question set picker, answer time picker, join link with **Copy**, "Open display screen". **Warning when the test set is selected:** "You're about to run the test questions."
- **Presentation clicker support:** **→ / PageDown / Space** trigger the primary button; debounced, and the server rejects out-of-phase steps.

### Big screen (projector, Carbon g100 theme, never scrolls)

| Screen | Content |
|---|---|
| Lobby | Large QR code generated from the real join address, the URL, player count, grid of joined players |
| Countdown | Question number, huge countdown number |
| Question | Display-size question text, 2×2 answer tiles in the same colours as the phones, timer bar with seconds |
| Time's up / Reveal | Correct tile highlighted, others dimmed, count bar per option |
| Leaderboard | Top 10 |
| Final | Staged podium, confetti on the champion |

### Accessibility

- WCAG AA contrast (Carbon themes; the four answer colours are checked).
- Colour is never the only cue: every answer carries its letter.
- Focus ring for keyboard users only (Rinkside rule).
- Phones announce phase changes in a polite live region; the timer is not read every second.
- `prefers-reduced-motion` turns off countdown animation and confetti.
- Tap targets ≥ 48 px; answer tiles ≥ 72 px high.

### Responsive

| View | Designed for | Range |
|---|---|---|
| Player | 360–430 px | Works from 320 px. Tiles stack in one column; 2×2 from 600 px. |
| Host | 1280 px+ | Works down to 1024 px; panels stack below that. |
| Big screen | 1920×1080 and 1280×720 | Text scales with the screen, never scrolls |

## 4. Visual system

- **Themes:** White (phones), g10 (host), g100 (big screen).
- **Font: IBM Plex Sans, self-hosted, as in Rinkside.** This replaces the L1 risk note about overriding the font: Carbon is tuned for Plex, and the quiz avoids an IBM look through no IBM logo, its own wordmark ("XD Team Quiz") and its own answer colours.
- **Accent:** Carbon default blue for now. All theme-specific colours live in one token file (`quiz-tokens.scss`), so the Christmas step only swaps tokens.
- **Answer colours A–D:** Carbon Blue 60, Purple 60, Teal 60, Magenta 60, the same on phones and big screen. Final values checked for contrast against white text.
- **Spacing tokens only:** 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Carbon components where Carbon has them:** UI Shell header, Button, TextInput, Tile / SelectableTile (avatars), ContentSwitcher (question set, answer time), Tag, InlineNotification, Modal, ProgressBar (timer), StructuredList (players, leaderboard), CopyButton, OverflowMenu. Custom: answer tile, podium, countdown number, QR card.
- **Motion:** Carbon motion tokens; one "pop" on countdown numbers, a short highlight on reveal, CSS-only confetti at the champion stage.
- No pixel art, no background images.

## 5. Copy

| Where | Text |
|---|---|
| Join | "Join the quiz" · "Your name" · "Pick an avatar" · **Join** |
| Join errors | "Enter a name." · "That name is already taken." · "The quiz has started. Playing already? Enter the same name to rejoin." |
| Lobby | "You're in, {name}!" · "Waiting for the host to start." · "{n} players joined" |
| Question | "Question {x} of {y}" · "Sending…" · "Answer locked" · "Couldn't send your answer. Tap again." |
| Time's up | "Time's up!" · "Waiting for the host to reveal the answer." |
| Reveal | "Correct! +{points}" · "Not this time" · "No answer" |
| Connection | "Reconnecting…" · "Connection lost." **Retry** |
| Reset | "The quiz was reset. Join again to play." |
| Host warning | "You're about to run the test questions." |
| Final | "Final results" · "Champion" · "Runner-up" · "3rd place" |

## 6. Architecture and server changes

**Build setup**
- **Vite + React 19 + `@carbon/react` 1.x + Sass**, multi-page build (`participant.html`, `host.html`, `display.html`) to `dist/`.
- `server.js` stays plain Node and serves `dist/` instead of `public/`.
- One deployment, one instance. Render build command becomes `npm install && npm run build`.

**Live connection (S2, S3)**
- Shared `useQuizState` hook. A watchdog closes and reopens the stream if nothing arrives for 25 s; server heartbeat goes to every 10 s.
- Immediate check when the phone returns to the foreground (`visibilitychange`).
- Reconnect backoff 1, 2, 4… s, max 10 s.

**Rendering (S1, S5)**
- React updates only what changed; the name field is owned by its screen and never reset by incoming updates.

**Answers (S4, S5)**
- "Locked" only after the server replies that it recorded the answer; the reply includes the recorded option.
- Automatic retry up to 3 times, then the player is asked to tap again. The first recorded answer always wins.

**Server changes**
1. **Public id + secret token.** Join returns a `token` only the joining phone knows; answers need it (Discrepancies 7).
2. **Presence:** each stream identifies its player, so the server knows who's connected (host dots, rejoin, early end).
3. **Scores update at the reveal**, not at answer time (Discrepancies 8).
4. **Early end**, **tie rule**, **rejoin by name** (section 2).
5. **Validation:** `optionIndex` 0–3; request bodies capped at 10 KB (Discrepancies 12).
6. **Join address from the server:** `PUBLIC_URL` if set, else the request host; on localhost falls back to the laptop's network IP (Discrepancies 6).
7. **Startup warning without `HOST_PIN`**; timing-safe PIN comparison (Discrepancies 9).
8. **Correct `.woff2` content type**; anti-buffering headers on the stream (Discrepancies 13).
9. **"No answer" flag** for players who didn't answer (Discrepancies 5).

**Unchanged:** question format and files, scoring formula, phase flow, PIN gate, staged final reveal with podium data hidden on the server.

## 7. Acceptance criteria

- **S1–S9 from L1**, each with a test:
  - S1: a typed name survives 20 other players joining (e2e).
  - S2: a cut stream reconnects within 10 s and lands on the current screen.
  - S3: the connection banner appears and disappears correctly.
  - S4/S5: a dropped answer request is retried; the recorded option is the one shown.
  - S6: a refreshed player stays in the game.
  - S7: `npm run simulate` with 25 players through the whole quiz: 0 errors, every player sees every phase.
  - S8: real-phone rehearsal by the user, with the checklist.
  - S9: startup warning plus the hosting checklist.
- **Feature parity:** every 🟢 page in `docs/features/` still works as described, or is updated to the approved change.
- The four decisions in section 2 behave as described.
- Automated accessibility scan (axe) on every screen: no serious or critical issues.
- Big screen doesn't scroll at 1280×720.

## 8. File-change plan

**New**
- `package.json` (rewritten): `react`, `react-dom`, `@carbon/react`, `@carbon/icons-react`, `@ibm/plex`, `qrcode`; dev: `vite`, `@vitejs/plugin-react`, `sass`, `vitest`, `@playwright/test`, `@axe-core/playwright`. Scripts: `dev`, `build`, `start`, `test`, `test:e2e`, `simulate`.
- `vite.config.js`; `client/participant.html`, `client/host.html`, `client/display.html`.
- `client/src/shared/`: `useQuizState.js`, `api.js` (post with retry), `clock.js`, `avatars.js`, `format.js`; components `AnswerTile`, `TimerBar`, `Avatar`, `Leaderboard`, `Podium`, `ConnectionBanner`.
- `client/src/participant/`: `App` + screens `Join`, `Lobby`, `Countdown`, `Question`, `TimeUp`, `Reveal`, `Leaderboard`, `Final`.
- `client/src/host/`: `App`, `PinGate`, `HostHeader`, `StagePanel`, `SetupPanel`, `PlayersPanel`, `JoinPanel`, `FinalRevealPanel`, `ResetModal`.
- `client/src/display/`: `App` + views `Lobby` (QR), `Countdown`, `Question`, `Reveal`, `Leaderboard`, `Final`.
- `client/src/styles/`: `main.scss` (Carbon themes, self-hosted Plex), `quiz-tokens.scss`.
- `tests/server/*.test.js` (`node:test`), `tests/unit/` (Vitest), `tests/e2e/` (Playwright), `scripts/simulate-players.js` (S7).
- `CHANGELOG.md`, `VERSIONING.md`.

**Changed**
- `server.js` (section 6), `README.md` (rewritten), `start-server.bat` / `.ps1` (build, then start), `.gitignore` (`dist/`, test output), `docs/features/*` (with each version that changes a feature), `ux-forge/state.md`.

**Removed**
- `public/` (arcade `app.js`, `styles.css`, HTML pages, pixel assets) — preserved in tag `v1-arcade-summer`.

**Kept as is:** `questions/*.md`, `AGENTS.md`.

## 9. Release plan

The arcade counts as v1, so this work goes v1.1 → v1.5, then v2.0.0. **One version per session; after each version the user decides whether to continue** (see `state.md`).

| Version | Content | Usable after? |
|---|---|---|
| **v1.1.0** | Server hardening (section 6) with server tests and the 25-player simulation; the arcade client gets the small change it needs to send the token | Yes — arcade UI on a fixed server |
| **v1.2.0** | Build setup, Carbon foundation, live-state hook, **player app** | Yes — new phones, arcade host and display |
| **v1.3.0** | **Host app** | Yes |
| **v1.4.0** | **Big-screen app**; `public/` removed | Yes — full v2 UI |
| **v1.5.0** | Stability pass: e2e tests, accessibility scan, full S7 run, README, event checklist | Ready for rehearsal |
| **v2.0.0** | After the user's real-phone rehearsal (S8): merge to `main` and deploy | Party version — needs the user's explicit go-ahead |

## 10. Validation plan

- Every version: `npm test` (server + unit) and `npm run build`.
- From v1.2.0: e2e tests for the changed screens.
- v1.1.0 and v1.5.0: `npm run simulate` (25 players).
- Visual checks by the user (`Visual checks: user`): after each version, a list of screens, widths and states to look at.
- Before v2.0.0: rehearsal checklist — a phone on mobile data, the venue Wi-Fi if possible, all questions, reset, Render plan not sleeping.

## Risks

- **Carbon's Sass build:** Rinkside needed webpack because Turbopack couldn't compile it. Vite uses a different compiler; verified first in v1.2.0.
- **Emoji avatars** vary slightly between Android, iOS and Windows.
- **Clickers** send different keys; unusual ones are added in v1.3.0.
