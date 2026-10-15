# Answer a question

> **Player → "Get ready" countdown → question with four options → "Time is up"**: tap one answer before the timer runs out.

| Status | Since | Depends on |
|---|---|---|
| 🟡 Partial (silent failures, see Rules) | v1-arcade-summer | [scoring](scoring.md), [live updates](live-updates-and-connection.md) |

## What it is

Each question starts with a 3-second **countdown** ("Question 2 of 25 · Get ready · 3"). Then the **question** shows with four options labelled A–D and a timer bar that empties over the answer time. The player taps one option; it's highlighted and all options lock. When the time runs out, the phone shows **"Time is up · Waiting for the host to reveal the answer."**

## How it works

- Tapping sends `POST /api/answer` with the player id and `optionIndex` (0–3).
- The chosen option is also kept in `sessionStorage` (`xd-summer-quiz-answer-<id>-<question>`) so it stays highlighted after a redraw and on the reveal screen.
- **The first answer counts.** Later answers for the same question are ignored (the server still replies `ok`).
- The server records the time it received the answer and scores it straight away ([Scoring](scoring.md)).
- The answer window closes on the server's timer, not the phone's. The phone's timer bar is corrected for clock differences using `serverNow` from each update.

## Rules & edge cases

- Answers outside the answer window: "The answer window is closed."
- The category (e.g. "USA") is not shown on phones, only on the host view.
- Once the server confirms (the player shows as `answered`), the options render disabled.
- **Known issues:** a failed send isn't handled, so the phone looks answered but the player is scored as missed (Discrepancies 3). Until the server confirms, other players' answers redraw the screen with the options enabled again, and a second tap moves the highlight even though the first answer is scored (Discrepancies 4). Out-of-range `optionIndex` values aren't rejected (Discrepancies 12).

## Entry points

- Screens: `renderParticipantCountdown`, `renderParticipantQuestion`, `renderParticipantTimeUp` in `public/app.js`
- Tap handling: `bindParticipantAnswerActions`
- Timer: `secondsLeft`, `progressPercent`, `renderTimerOnly`, `startTimerAnimationLoop`

## Under the hood

- Server: `startCountdown`, `startAnswering`, `answerQuestion` in `server.js`. Answers for the current question are cleared at the start of its countdown (`resetQuestionAnswers`)
- Constants: `COUNTDOWN_MS` (3000), answer time from [Set up the quiz](set-up-the-quiz.md)
