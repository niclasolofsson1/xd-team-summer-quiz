# Watch the final podium

> **Player and big screen → "Final results"**: the final standings are revealed in three steps, ending with the champion.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon player app v1.2.0 · Carbon big screen v1.4.0 | [run the final reveal](run-the-final-reveal.md) |

## What it is

After the last question, phones and the big screen show the final results, unlocked step by step by the host:

| Stage | What phones show |
|---|---|
| 0 | "Final results" · "Waiting for the host to start the final results." |
| 1 | The **final standings from 4th place down**; the three podium places show "?" |
| 2 | **3rd place** unlocks |
| 3 | **Champion and runner-up** unlock together |

The podium is laid out 2nd – 1st – 3rd, labelled "Runner-up", "Champion" and "3rd place". Each revealed place shows its medal (🥇 🥈 🥉, by rank, so a shared place shares its medal), the avatar, the name and the points. No confetti on phones (removed in v1.2.3 at the user's request). Once the player's own place is revealed, the phone says "You finished 5th · 3200 points" and marks the player with a grey "You" tag on the podium (since v1.2.8, no frame) or a highlighted row in the standings.

**Big screen (since v1.4.0):** the same podium at display size, under "Final results" and a line per stage ("The host will reveal the final results.", "4th place and down.", "3rd place.", "Champion and runner-up."). From stage 1 the final standings sit beside it (9 rows, then "and N more players"). Once the champion is revealed, **confetti keeps falling** in the answer colours plus yellow and white for as long as the screen stays there (CSS only, pieces loop with staggered starts; user's choice from the mockup). Off with reduced motion.

## How it works

- The server hides locked players: in the `finished` phase, `leaderboard` only contains visible ranks, and locked players in `participants` are sent as "Locked player" with no avatar or score (`finalRankVisible`). The podium can't be peeked at from the data.
- 1st and 2nd are revealed together so the runner-up doesn't give the champion away.
- `finalLayout` (`client/src/shared/podium.js`) places what the server has revealed: three podium places, each revealed, locked or empty, plus the standings.

## Rules & edge cases

- Fewer than 3 players: the empty places show "No player".
- Players sharing a podium rank beyond three places (e.g. two players on =3rd) are listed first in the standings, with their shared rank.
- Long names wrap on the podium.
- Revealed places slide in, which is off with reduced motion.

## Entry points

- Player: `client/src/participant/screens/Final.jsx`; parts `client/src/shared/components/Podium.jsx`, `Leaderboard.jsx`
- Big screen: `client/src/display/screens/Final.jsx`, `Confetti.jsx`; styles in `display.scss`

## Under the hood

- Server: `finishQuiz`, `advanceFinalReveal`, `finalRankVisible`, `publicLeaderboard` in `server.js`
- Tests: `tests/unit/format-clock-podium.test.js`
