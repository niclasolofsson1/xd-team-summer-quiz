# Run a question

> **Host → control column → the primary button** (or a presentation clicker): step through each question — countdown, answers, reveal, leaderboard, next.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | [answer a question](answer-a-question.md), [see if you were right](see-if-you-were-right.md) |

## What it is

During the game the host dashboard has (since v1.3.1, Carbon's 2x Grid) a **stage** on the left (10 of 16 columns, full height) where the question takes centre stage, and on the right a **control column**: "Question x of y", a heading for the phase, a line about what's next and **one primary button** across the full width (64 px, label left, arrow right), with the **players panel** under it. Below 1024 px they stack: control, stage, players.

| Phase | Stage shows | Control column: heading · primary button |
|---|---|---|
| `countdown` | "Question x of y" and a large 3-2-1 | "Get ready" · **Reveal answer**, disabled — "The question is about to appear." |
| `answering` | Category tag, "Question x of y", the question in large type, the four answers (letter + colour), the timer bar | "Players are answering" · **Reveal answer**, disabled — "Reveal unlocks when the time is up or everyone has answered." |
| `awaitingReveal` | The question and answers | "Time's up" · **Reveal answer** — "Answer window closed. Reveal when you're ready." |
| `reveal` | The correct answer marked (the others tinted), picks per answer, **Correct / Missed / Players** | "Answer revealed" · **Show leaderboard** — "Next: the leaderboard after this question." (last question: **Reveal final results**) |
| `leaderboard` | "Leaderboard after question x": top 10 | "Leaderboard" · **Next question** |

**Players panel:** for each player the avatar, name, a **connected dot** (filled green = online, red ring = offline), during a question an **answered check** or an empty ring (not answered yet), and the score. Summary line: "18 of 20 answered · 2 offline" during a question, "20 players · 2 offline" otherwise (the offline part only when someone is offline).

**Presentation clicker:** **→**, **PageDown** and **Space** press the primary button.

- At most one press per second (debounced), so a double-click can't skip a step.
- Ignored while typing in a field, while the Reset dialog or the menu is open, and while the button is disabled.
- Space is left to the browser when focus is on another button or link (Space on Copy link copies).
- ← / PageUp and the clicker's blank-screen key do nothing (there's no step back).

## How it works

- Countdown and answer window run on server timers (`setTimeout`); the move from `answering` to `awaitingReveal` is automatic, either when the timer runs out or when every joined player has answered (`closeAnswering`).
- Reveal, leaderboard and next are manual, so the host sets the pace (good for talking between questions).
- `POST /api/reveal`, `/api/leaderboard`, `/api/next`. Each only works in its own phase; a press in the wrong phase does nothing.
- **Host actions are sent once, never retried automatically** (a silent retry of the final reveal could skip a stage). While one is on its way the button says "Sending…"; a failure shows under the button ("Couldn't reach the quiz server. Try again." or the server's message).

## Rules & edge cases

- The answer window **ends early** when every joined player has answered (since v1.1.0). A disconnected player who hasn't answered keeps it open until the timer runs out. The host still triggers the reveal.
- After the last question, "Reveal final results" skips the leaderboard and goes to [the final reveal](run-the-final-reveal.md).
- The timer follows the server's clock and drains with one smooth animation, as on the phones.

## Entry points

- `client/src/host/App.jsx` (`Dashboard`: actions, clicker, layout), `StageView.jsx`, `ControlPanel.jsx`, `PlayersPanel.jsx`; styles in `host.scss`
- Plain logic: `hostStep`, `playersSummary` in `client/src/host/hostSteps.js`; `createClicker` in `client/src/host/clicker.js`
- Shared: `AnswerTile`, `TimerBar`, `Leaderboard`, `Avatar` in `client/src/shared/components/`

## Under the hood

- Server: `startCountdown`, `startAnswering`, `closeAnswering`, `revealAnswer`, `showLeaderboard`, `nextQuestion`, `setPhase`, `clearTimers` in `server.js`
- Tests: `tests/unit/host.test.js` (steps, summary, clicker), `tests/e2e/host.spec.js` (full run, clicker, layout)
