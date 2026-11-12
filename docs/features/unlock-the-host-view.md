# Unlock the host view

> **Host → `/host.html` → "Host access"**: enter the host PIN to open the control panel.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | [hosting](hosting.md) |

## What it is

When the server has a `HOST_PIN`, the host page first shows a **Host access** card: "Enter the host PIN to open the quiz dashboard.", a **Host PIN** field and **Open dashboard**. The right PIN opens the dashboard; a wrong one shows "Host PIN is incorrect." under the field.

## How it works

- The page asks `GET /api/host-status` whether a PIN is required. Without one, the dashboard opens straight away.
- The PIN is checked with `POST /api/host-unlock` and kept in `sessionStorage` (`xd-summer-quiz-host-pin`) for the rest of the browser session, so a refresh doesn't ask again.
- **Every host action sends the PIN** and the server checks it again (`authorizeHostAction`, a timing-safe comparison since v1.1.0). The PIN never appears in the public state.
- If any host action comes back with 403 (for example the server restarted with a new PIN), the saved PIN is cleared and the gate shows again with the server's message.

## Rules & edge cases

- Host actions: `start`, `reveal`, `leaderboard`, `next`, `final-reveal`, `set-question-set`, `set-answer-time`, `reset`, plus `final-preview` (`HOST_ACTIONS` in `server.js`).
- **No `HOST_PIN` set = anyone can control the quiz**, including from a phone. The server prints a warning at startup (since v1.1.0).
- No limit on PIN attempts.
- A saved PIN that no longer works is cleared and the form shows again.

## Entry points

- Page: `client/host.html`, built to `dist/host.html` (since v1.3.0; the arcade `public/host.html` is removed and kept in tag `v1-arcade-summer`)
- Gate: `client/src/host/PinGate.jsx`; PIN storage `loadHostPin` / `saveHostPin` in `client/src/shared/storage.js`; requests in `client/src/host/hostApi.js`

## Under the hood

- Server: `authorizeHostAction`, `/api/host-status`, `/api/host-unlock` in `server.js`
- Tests: `tests/e2e/host.spec.js` ("PIN gate"), `tests/unit/host.test.js` (`hostAction`)
