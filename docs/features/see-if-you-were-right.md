# See if you were right

> **Player → reveal screen**: a result banner, the correct answer marked, your answer marked, and how many picked each answer.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon player app v1.2.0 | [run a question](run-a-question.md), [scoring](scoring.md) |

## What it is

When the host reveals the answer, every phone shows a **result banner** — **"Correct! +850"**, **"Not this time"** or **"No answer"** — then the question with all four answers: the **correct answer** as the only full-colour tile, labelled "✓ Correct answer"; the **player's wrong pick** labelled "✕ Your answer" with a dashed outline; the wrong pick and the other answers in a light tint of their colour with dark text (since v1.2.3; readable at WCAG AA). Each answer shows how many players picked it ("3 picks").

## How it works

- In the `reveal` phase the server adds `correctIndex` to the question, `lastQuestionSummary.optionCounts` to the state, and each player's own `currentAnswer` (`optionIndex`, `correct`, `points`, `noAnswer`). Scores are added at this moment, not when the answer comes in.
- The marked answer comes from the server (`currentAnswer.optionIndex`); if that's missing, from the answer the phone had confirmed.

## Rules & edge cases

- A player who didn't answer gets `noAnswer: true` and sees **"No answer"** (since v1.1.0).
- The correct answer is never sent to phones before the reveal (`safeQuestion`).
- Colour is never the only cue: the marks are written out, and every answer keeps its letter.

## Entry points

- Screen: `client/src/participant/screens/Reveal.jsx`
- Part: `client/src/shared/components/AnswerTile.jsx` (marks `correct`, `wrong`, `dim`)

## Under the hood

- Server: `revealAnswer` (builds `lastQuestionSummary`), `publicAnswerResult`, `safeQuestion` in `server.js`
