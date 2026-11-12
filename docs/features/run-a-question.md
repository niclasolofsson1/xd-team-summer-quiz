# Run a question

> **Host → stage panel → the large primary button** (or a presentation clicker): step through each question — countdown, answers, reveal, leaderboard, next.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | [answer a question](answer-a-question.md), [see if you were right](see-if-you-were-right.md) |

## What it is

The host dashboard has two panels: the **stage panel** (left), showing what's happening now with **one large primary button** for the next step, and the **players panel** (right). From 1024 px the panels sit side by side; below that the players panel stacks underneath.

| Phase | Stage panel shows | Primary button |
|---|---|---|
| `countdown` | "Question x of y", "Get ready", a large 3-2-1 | **Reveal answer**, disabled — "The question is about to appear." |
| `answering` | Category tag, question, the four answers (letter + colour), the timer bar, "x of y answered" | **Reveal answer**, disabled — "Answer timer is running." |
| `awaitingReveal` | "Time's up", the question and answers, "x of y answered" | **Reveal answer** — "Answer window closed. Reveal when you're ready." |
| `reveal` | The correct answer marked (the others tinted), picks per answer, **Correct / Missed / Players** | **Show leaderboard** (last question: **Reveal final results**) |
| `leaderboard` | "Leaderboard": top 10 | **Next question** |

**Players panel:** for each player the avatar, name, a **connected dot** (filled green = online, red ring = offline), an **answered check** during a question, and the score. Summary line: "18 of 20 answered · 2 offline" during a question, "20 players · 2 offline" otherwise (the offline part only when someone is offline).

**Presentation clicker:** **→**, **PageDown** and **Space** press the primary button.

- At most one press per second (debounced), so a double-click can't skip a step.
- Ignored while typing in a field, while the Reset dialog or the menu is open, and while the button is disabled.
- Space is left to the browser when focus is on another button or link (Space on Copy copies).
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

- `client/src/host/App.jsx` (`Dashboard`: actions, clicker), `StagePanel.jsx`, `PlayersPanel.jsx`
- Plain logic: `hostStep`, `playersSummary` in `client/src/host/hostSteps.js`; `createClicker` in `client/src/host/clicker.js`
- Shared: `AnswerTile`, `TimerBar`, `Leaderboard`, `Avatar` in `client/src/shared/components/`

## Under the hood

- Server: `startCountdown`, `startAnswering`, `closeAnswering`, `revealAnswer`, `showLeaderboard`, `nextQuestion`, `setPhase`, `clearTimers` in `server.js`
- Tests: `tests/unit/host.test.js` (steps, summary, clicker), `tests/e2e/host.spec.js` (full run, clicker, layout)
