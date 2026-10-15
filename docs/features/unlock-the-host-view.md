# Unlock the host view

> **Host → `/host.html` → "Host access"**: enter the host PIN to open the control panel.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [hosting](hosting.md) |

## What it is

When the server has a `HOST_PIN`, the host page first shows a PIN form ("Enter the host PIN to open the quiz dashboard"). The right PIN opens the dashboard; a wrong one shows "Host PIN is incorrect."

## How it works

- The page asks `GET /api/host-status` whether a PIN is required. Without one, the dashboard opens straight away.
- The PIN is checked with `POST /api/host-unlock` and kept in `sessionStorage` (`xd-summer-quiz-host-pin`) for the rest of the browser session, so a refresh doesn't ask again.
- **Every host action sends the PIN** and the server checks it again (`authorizeHostAction`). The PIN never appears in the public state.

## Rules & edge cases

- Host actions: `start`, `reveal`, `leaderboard`, `next`, `final-reveal`, `set-question-set`, `set-answer-time`, `reset`, plus `final-preview` (`HOST_ACTIONS` in `server.js`).
- **No `HOST_PIN` set = anyone can control the quiz**, including from a phone (Discrepancies 9).
- No limit on PIN attempts.
- A saved PIN that no longer works (server restarted with a new PIN) is cleared and the form shows again.

## Entry points

- Page: `public/host.html` (`data-view="host"`)
- Gate: `startHost`, `renderHostGate`, `bindHostGate` in `public/app.js`

## Under the hood

- Server: `authorizeHostAction`, `/api/host-status`, `/api/host-unlock` in `server.js`
