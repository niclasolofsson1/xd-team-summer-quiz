# See if you were right

> **Player → reveal screen**: the correct answer lights up, your answer is marked, and you see your points for the question.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [run a question](run-a-question.md), [scoring](scoring.md) |

## What it is

When the host reveals the answer, every phone shows the question again with all four options: the **correct option highlighted**, the **player's own answer marked** if it was wrong, and the other options dimmed. Each option shows **how many players picked it**. Below, a result card says **"Correct! · +<points> points"** or **"Incorrect · 0 points"**.

## How it works

- In the `reveal` phase the server adds `correctIndex` to the question, `lastQuestionSummary.optionCounts` to the state, and each player's own `currentAnswer` (`optionIndex`, `correct`, `points`).
- The marked answer comes from the server (`currentAnswer.optionIndex`); if that's missing, from `sessionStorage`.

## Rules & edge cases

- **Known issue:** a player who didn't answer also sees "Incorrect · 0 points" instead of something like "No answer" (Discrepancies 5).
- The correct answer is never sent to phones before the reveal (`safeQuestion`).

## Entry points

- Screen: `renderParticipantReveal` in `public/app.js`
- Classes: `correct`, `your-answer`, `reveal-dim` on `.question-answer`

## Under the hood

- Server: `revealAnswer` (builds `lastQuestionSummary`), `publicAnswerResult`, `safeQuestion` in `server.js`
