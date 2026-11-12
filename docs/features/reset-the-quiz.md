# Reset the quiz

> **Host → header menu (⋮) → "Reset quiz…"**: clear everything and go back to an empty lobby.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | — |

## What it is

**Reset quiz…** sits in the overflow menu at the right of the host header, away from the primary button. It opens a Carbon **danger modal**, "Reset the quiz?": all players and scores are removed, the quiz goes back to an empty lobby, the settings go back to Test questions and 15 s, and players have to join again. **Reset quiz** (red) confirms; **Cancel** or Esc closes it.

## How it works

- `POST /api/reset` stops all timers and replaces the state with a fresh one (`initialState`): lobby, no players, no scores.
- Settings go back to the defaults: Test questions, 15 s.
- Phones still holding an old player id no longer find themselves in the list and return to Join with "The quiz was reset. Join again to play."
- The clicker keys do nothing while the modal is open.

## Rules & edge cases

- Works in any phase, including mid-question.
- **Reset before the live event** (see the checklist in the README), and remember to pick the right question set again afterwards (the test-set warning reminds you).
- A server restart has the same effect as Reset, because all state is in memory ([Hosting](hosting.md)).

## Entry points

- `client/src/host/HostHeader.jsx` (menu), `ResetModal.jsx`, `confirmReset` in `App.jsx`

## Under the hood

- Server: `resetQuiz`, `initialState`, `clearTimers` in `server.js`
- Tests: `tests/e2e/host.spec.js` ("reset from the menu")
