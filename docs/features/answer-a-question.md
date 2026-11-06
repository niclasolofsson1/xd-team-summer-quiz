# Answer a question

> **Player → countdown → question with four answers → "Time's up!"**: tap one answer before the timer runs out.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon player app v1.2.0 | [scoring](scoring.md), [live updates](live-updates-and-connection.md) |

## What it is

Each question starts with a 3-second **countdown** ("Question 2 of 25" and a large 3-2-1). Then the **question** shows with four answer tiles, each with its letter and colour (A Blue, B Purple, C Teal, D Magenta), and a timer bar with the seconds left. The player taps one answer: it shows **"Sending…"**, then **"Answer locked"** once the server has recorded it. The pick gets a solid Carbon blue stroke and "Your answer"; the other answers turn to a light tint. When the time runs out (or everyone has answered), the phone shows **"Time's up!"**, "Waiting for the host to reveal the answer." and the locked answer.

## How it works

- Tapping sends `POST /api/answer` with the player's **token** and `optionIndex` (0–3). All tiles are disabled while sending, so a second tap can't change anything.
- **"Answer locked" only after the server confirms.** The reply includes the option the server recorded, and that is the option shown (S5). The first recorded answer always wins: if an earlier request got through but its reply was lost, the retry gets that first option back.
- **Retries:** a network error, a timeout (5 s) or a server error is retried up to 3 times (after 0.5, 1 and 2 s). If all fail: "Couldn't send your answer. Tap again." and the tiles work again (S4). A closed window shows the server's "The answer window is closed."
- The confirmed option is kept in the app and in `sessionStorage` (`xd-quiz-answer-<id>-<question>`), so it stays marked on "Time's up!" and the reveal, and after a refresh.
- The answer window closes on the server's timer, not the phone's, **or as soon as every joined player has answered** (since v1.1.0). The timer follows the server's clock: each update carries `serverNow`, and the phone works out the difference (`clock.js`). The bar drains with one linear CSS animation from the time left (`drainStart`), smooth at the phone's frame rate; the seconds update every 250 ms (since v1.2.7).

## Rules & edge cases

- The category (e.g. "USA") is not shown on phones, only on the host view.
- When the last player answers, the server moves everyone to "Time's up!" before it replies; the locked answer appears there as soon as the reply arrives.
- If the server already counts the player as answered (`answered`), the question shows "Answer locked" even without a local record.
- Fixed in v1.2.0: a failed send was silent (Discrepancies 3), and a second tap could change what was shown while the first answer was scored (Discrepancies 4).
- Tiles stack in one column on phones and form a 2×2 grid from 600 px. Each tile is at least 72 px high.

## Entry points

- Screens: `client/src/participant/screens/Countdown.jsx`, `Question.jsx`, `TimeUp.jsx`
- Parts: `client/src/shared/components/AnswerTile.jsx`, `TimerBar.jsx` (Carbon ProgressBar)
- Sending: `client/src/shared/answer.js` (`submitAnswer`), `api.js` (`postWithRetry`)

## Under the hood

- Server: `startCountdown`, `startAnswering`, `answerQuestion` in `server.js`. Answers for the current question are cleared at the start of its countdown (`resetQuestionAnswers`)
- Constants: `COUNTDOWN_MS` (3000), answer time from [Set up the quiz](set-up-the-quiz.md)
- Tests: `tests/unit/api-and-answer.test.js`; e2e S4/S5 in `tests/e2e/player.spec.js`
