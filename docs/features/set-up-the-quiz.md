# Set up the quiz

> **Host → lobby → "Question set" and "Answer time"**: choose which questions to play and how long players get, then start.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [writing questions](writing-questions.md), [unlock the host view](unlock-the-host-view.md) |

## What it is

In the lobby the host dashboard shows:

- **Question set:** a toggle between "Test questions" and "Real questions", each with its question count.
- **Answer time:** 5s, 10s, 15s, 20s or 30s.
- **Join the Quiz** card: the player link, a count of who's joined, and a link to open the audience display.
- **Participants** list and an empty **leaderboard**.
- **Start quiz** in the control bar, disabled until at least one player has joined.

## How it works

- `POST /api/set-question-set` (`questionSetId`) and `POST /api/set-answer-time` (`answerSeconds`). Both are only allowed in the lobby.
- The server accepts any whole number of seconds from 5 to 30; the UI offers five presets.
- `POST /api/start` moves to the first question's countdown ([Run a question](run-a-question.md)).

## Rules & edge cases

- Defaults: **Test questions, 15 s**. Reset goes back to these defaults (Discrepancies 10).
- Settings can't be changed once the quiz has started: "Question set can only be changed in the lobby." / "Answer time can only be changed in the lobby."
- Start does nothing with no players.
- The control bar always shows the current question set as a pill, so the host can see which set is live.

## Entry points

- Dashboard: `renderHost`, `hostHeader`, `questionSetCard`, `answerTimeControl`, `joinBlock`, `participantList` in `public/app.js`

## Under the hood

- Server: `setQuestionSet`, `setAnswerTime`, `startQuiz`; limits `MIN_ANSWER_MS`, `MAX_ANSWER_MS`, `DEFAULT_ANSWER_MS` in `server.js`
