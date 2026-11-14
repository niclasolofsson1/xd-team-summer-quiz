# Live updates and connection

How every screen (phones, host, big screen) stays in sync with the server.

## The model

- **The server owns the state** (`state` in `server.js`, in memory). Clients only display it and send actions.
- **One stream for everyone:** each page opens `GET /events` (Server-Sent Events); a player's phone adds its token (`/events?token=…`) so the server knows which players are connected. On connect, and after **every change** (including a player connecting or dropping), the server sends the whole public state as one JSON message (`broadcast` → `publicState`).
- `GET /api/state` returns the same state as plain JSON (used by tests).
- **Actions are plain `POST /api/<action>`** with a JSON body ([Unlock the host view](unlock-the-host-view.md) lists the host ones; players use `join` and `answer`).

## What the public state contains

`phase`, `countdownMs`, `answerMs`, `currentQuestionIndex`, `finalRevealStage`, `questionSetId` / `questionSetName` / `questionSets`, `totalQuestions`, `serverNow`, `phaseStartedAt`, `phaseEndsAt`, `participants` (id, name, avatarId, score, answered, connected, currentAnswer), `leaderboard` (with `tied`), `question` (no `correctIndex` until the reveal), `lastQuestionSummary`.

What it hides: the correct answer before the reveal (`safeQuestion`), every answer and score change until the reveal, locked podium players in the final phase (`finalRankVisible`), player tokens, and the host PIN.

## Heartbeat

The server sends a `heartbeat` event every 10 s (`HEARTBEAT_MS`) to every open stream. The stream has anti-buffering headers (`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`) so proxies pass messages on at once.

## Player, host and big-screen apps (player since v1.2.0, host since v1.3.0, big screen since v1.4.0)

`createLiveConnection` (`client/src/shared/liveConnection.js`), used through the `useQuizState` hook:

- **Watchdog:** any message or heartbeat counts as a sign of life. If nothing arrives for **25 s**, the stream is closed and reopened, so a silent drop no longer leaves a phone stuck (Discrepancies 2, fixed).
- **Reconnect with backoff:** 1, 2, 4, 8, then every 10 s. The app opens new streams itself instead of relying on the browser's own retry.
- **Back in the foreground** (`visibilitychange`): if the stream is closed or has been quiet for more than 12 s, it's reopened at once.
- **Connection banner** on every screen after joining: hidden when connected, **"Reconnecting…"** during a drop, **"Connection lost."** with **Retry** after 30 s without a connection (it keeps trying in the background too). The banner is a status message, so it never takes focus from the answer tiles.
- **Host (since v1.3.0):** the same connection without a token. The header shows the status as a tag (Connected / Reconnecting… / Connection lost) and the same banner appears above the panels.
- **Big screen (since v1.4.0):** the same connection without a token. No banner (nothing to click); a grey "Reconnecting…" or red "Connection lost" tag in its top bar while the connection is down.
- After joining, the stream is reopened with the new token. Only a state from the player's own stream can say "this player is gone" (after a reset), so a state sent just before joining is never mistaken for it.

## Timing

Phases with a timer carry `phaseStartedAt` and `phaseEndsAt` (server time). Each client computes an offset from `serverNow` so timers line up even if the phone's clock is off (`client/src/shared/clock.js`).

## Rendering

- React updates only what changed (player, host and big screen). Form fields and answer states belong to their screen and are never reset by incoming updates. The arcade big screen, which redrew everything on each message, was removed in v1.4.0.
- **Arcade big screen** (until v1.4.0): every message redraws the whole screen with `innerHTML` (`render`); a "signature" of the important fields (`renderSignature`) decides whether the 250 ms tick needs a full redraw. They count 45 s without data as "Offline" and rely on the browser's `EventSource` retry.

## Where it lives

- Server: `/events` handler, `broadcast`, `sendEvent`, `sendHeartbeat`, `publicState` in `server.js`
- Apps: `client/src/shared/liveConnection.js`, `useQuizState.js`, `components/ConnectionBanner.jsx`
- Tests: `tests/unit/liveConnection.test.js` (watchdog, backoff, lost, Retry, foreground); e2e S2/S3 in `tests/e2e/player.spec.js`
