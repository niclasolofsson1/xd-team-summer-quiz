# Run a question

> **Host → control bar primary button**: step through each question — countdown, answers, reveal, leaderboard, next.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [answer a question](answer-a-question.md), [see if you were right](see-if-you-were-right.md) |

## What it is

The host control bar always has one primary action for the current step:

| Phase | Host sees | Primary action |
|---|---|---|
| `countdown` | "Get ready" with the 3-2-1 timer | — ("The next question is about to appear.") |
| `answering` | The question with options and category, the timer, "x of y answered" | — ("Answer timer is running.") |
| `awaitingReveal` | "Answer window closed. Pause here, then reveal…" | **Reveal answer** |
| `reveal` | The correct option highlighted; "This was the right answer" with Correct / Missed / Players counts | **Show leaderboard** (last question: **Reveal final results**) |
| `leaderboard` | "Leaderboard after this question" | **Next question** |

The participants list shows a dot per player that fills in when they've answered.

## How it works

- Countdown and answer window run on server timers (`setTimeout`); the move from `answering` to `awaitingReveal` is automatic.
- Reveal, leaderboard and next are manual, so the host sets the pace (good for talking between questions).
- `POST /api/reveal`, `/api/leaderboard`, `/api/next`. Each only works in its own phase; a click in the wrong phase does nothing.

## Rules & edge cases

- The answer timer always runs to the end, even when everyone has answered (to decide in L2).
- After the last question, "Reveal final results" skips the leaderboard and goes to [the final reveal](run-the-final-reveal.md).
- An error from a host action (e.g. a wrong PIN) shows under the control bar.

## Entry points

- `hostAction`, `hostMain`, `responseProgress`, `answerSummary`, `bindHostActions` in `public/app.js`

## Under the hood

- Server: `startCountdown`, `startAnswering`, `revealAnswer`, `showLeaderboard`, `nextQuestion`, `setPhase`, `clearTimers` in `server.js`
