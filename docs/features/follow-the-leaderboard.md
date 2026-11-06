# Follow the leaderboard

> **Player → "Leaderboard"**: after each question except the last, see your rank, your score and the top 10.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon player app v1.2.0 | [scoring](scoring.md), [run a question](run-a-question.md) |

## What it is

When the host shows the leaderboard, each phone shows a card with **"Your rank"** (e.g. "3rd", or "=5th" for a shared place) and **"Your score"**, then the **top 10**: rank, avatar, name and points. The player's own row is highlighted; if it's outside the top 10, it's pinned below the list.

## How it works

- Shown in the `leaderboard` phase, which the host opens after the reveal of every question except the last. After the last question the quiz goes to the [final podium](watch-the-final-podium.md) instead.
- The list is the server's `leaderboard` (sorted by score, then faster correct answers; `tied` marks a shared rank).

## Rules & edge cases

- Ranks use ordinals (`ordinal` / `rankLabel` in `client/src/shared/format.js`: 1st, 2nd, 3rd, 11th, =5th).
- Long names are cut with an ellipsis so rows stay on one line.
- The big screen shows its own list ([Big screen](show-the-big-screen.md)).

## Entry points

- Screen: `client/src/participant/screens/Leaderboard.jsx`
- List: `client/src/shared/components/Leaderboard.jsx` (Carbon StructuredList)

## Under the hood

- Server: `leaderboard()`, `showLeaderboard()` in `server.js`
