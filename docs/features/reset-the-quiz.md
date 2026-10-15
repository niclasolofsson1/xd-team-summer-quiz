# Reset the quiz

> **Host → control bar → Reset**: clear everything and go back to an empty lobby.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | — |

## What it is

The **Reset** button is always in the control bar. It asks "Reset the quiz? This will clear the current live quiz state." and, on OK, wipes the quiz.

## How it works

- `POST /api/reset` stops all timers and replaces the state with a fresh one (`initialState`): lobby, no players, no scores.
- Settings go back to the defaults: Test questions, 15 s.
- Phones still holding an old player id no longer find themselves in the list and return to the welcome screen; their saved answers are cleared in the lobby.

## Rules & edge cases

- Works in any phase, including mid-question.
- **Reset before the live event** (see the checklist in the README), and remember to pick the right question set again afterwards.
- A server restart has the same effect as Reset, because all state is in memory ([Hosting](hosting.md)).

## Entry points

- Reset button in `hostHeader`; confirm in `bindHostActions` (`public/app.js`)

## Under the hood

- Server: `resetQuiz`, `initialState`, `clearTimers` in `server.js`
