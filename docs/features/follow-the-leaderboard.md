# Follow the leaderboard

> **Player → "High scores"**: after each question except the last, see your score, your rank and the full list.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [scoring](scoring.md), [run a question](run-a-question.md) |

## What it is

When the host shows the leaderboard, each phone shows a **"Your score"** card (total points and rank, e.g. "3rd") and the **"High scores"** list: rank, avatar, name and points for every player, with the player's own row highlighted.

## How it works

- Shown in the `leaderboard` phase, which the host opens after the reveal of every question except the last. After the last question the quiz goes to the [final podium](watch-the-final-podium.md) instead.
- The list is the server's `leaderboard` (sorted by score, then name).

## Rules & edge cases

- Ranks use ordinals (`ordinalRank`: 1st, 2nd, 3rd, 11th…).
- Everyone is listed; with 25 players the list scrolls.
- The big screen shows the same list ([Big screen](show-the-big-screen.md)).

## Entry points

- Screen: `renderParticipantLeaderboard` in `public/app.js`

## Under the hood

- Server: `leaderboard()`, `showLeaderboard()` in `server.js`
