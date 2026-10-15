# Live updates and connection

How every screen (phones, host, big screen) stays in sync with the server.

## The model

- **The server owns the state** (`state` in `server.js`, in memory). Clients only display it and send actions.
- **One stream for everyone:** each page opens `GET /events` (Server-Sent Events). On connect, and after **every change**, the server sends the whole public state as one JSON message (`broadcast` → `publicState`).
- `GET /api/state` returns the same state as plain JSON (not used by the client).
- **Actions are plain `POST /api/<action>`** with a JSON body ([Unlock the host view](unlock-the-host-view.md) lists the host ones; players use `join` and `answer`).

## What the public state contains

`phase`, `countdownMs`, `answerMs`, `currentQuestionIndex`, `finalRevealStage`, `questionSetId` / `questionSetName` / `questionSets`, `totalQuestions`, `serverNow`, `phaseStartedAt`, `phaseEndsAt`, `participants` (id, name, avatarId, score, answered, currentAnswer), `leaderboard`, `question` (no `correctIndex` until the reveal), `lastQuestionSummary`.

What it hides: the correct answer before the reveal (`safeQuestion`), locked podium players in the final phase (`finalRankVisible`), and the host PIN.

## Heartbeat and status

- The server sends a `heartbeat` event every 15 s (`HEARTBEAT_MS`) to every open stream.
- The client counts any message or heartbeat as "Connected". After 45 s with nothing, it shows "Offline" (`checkConnectionFreshness`). On a stream error it shows "Reconnecting", and the browser's `EventSource` retries on its own.
- The connection pill is only shown on the **host** view.

## Timing

- Phases with a timer carry `phaseStartedAt` and `phaseEndsAt` (server time). Each client computes an offset from `serverNow` (`syncServerClock`) so timers line up even if the phone's clock is off.
- Timer numbers refresh every 250 ms (`renderTimerOnly`); timer bars animate every frame (`startTimerAnimationLoop`).

## Rendering

- **Every message redraws the whole screen** with `innerHTML` (`render`). A "signature" of the important fields (`renderSignature`) decides whether the 250 ms tick needs a full redraw.
- Entry animations only play when the screen actually changes (`participantScreenEnterClass`).

## Known issues

- Full redraws wipe form input and reset buttons: see [Join the quiz](join-the-quiz.md) and [Answer a question](answer-a-question.md).
- **A silent drop is never recovered.** If the stream goes quiet without an error (a phone waking from sleep, a stalled mobile network), "Offline" is shown but the connection is never reopened, and players can't see the pill. The phone stays on an old screen until refreshed (Discrepancies 2).
- Every player's id is sent to every client (Discrepancies 7), and scores change during the answer window (Discrepancies 8).

## Where it lives

- Server: `/events` handler, `broadcast`, `sendEvent`, `sendHeartbeat`, `publicState` in `server.js`
- Client: `connect`, `markConnectionEvent`, `checkConnectionFreshness`, `updateConnectionStatus`, `render`, `renderTimerOnly` in `public/app.js`
