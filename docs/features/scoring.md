# Scoring

## Points per question

| Answer | Points |
|---|---|
| Wrong | 0 |
| No answer | 0 |
| Correct | `round(250 + 750 × (1 − elapsed / answerTime))` → **1000** for an instant answer, **250** at the last moment |

- `elapsed` = from the start of the answer window (`phaseStartedAt` on the server) to when the server receives the answer. It uses server time only, so phone clocks don't matter; network delay counts as answer time.
- With a 15 s answer time, a correct answer after 3 s gives `250 + 750 × 0.8` = 850 points.
- Points are added to the player's total immediately, but players only see them at the reveal ([See if you were right](see-if-you-were-right.md)).

## Ranking

- Sorted by total score, highest first. **Equal scores are ordered by name (A–Z) and still get different ranks** (`leaderboard()`). How ties should work is an open question for L2 (Discrepancies 11).
- Ranks are shown as ordinals: 1st, 2nd, 3rd, 4th, 11th, 21st… (`ordinalRank` in `public/app.js`).

## Where it lives

- `answerQuestion` (points), `leaderboard` (ranking) in `server.js`
