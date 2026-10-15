# Watch the final podium

> **Player and big screen → "FINAL RESULTS · The roadtrip is complete"**: the final standings are revealed in three steps, ending with the champion.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [run the final reveal](run-the-final-reveal.md) |

## What it is

After the last question, phones and the big screen show the final results, unlocked step by step by the host:

| Stage | What everyone sees |
|---|---|
| 0 | "Final reveal locked · Waiting for the host to start the final results." |
| 1 | The **final standings from 4th place down**; the three podium slots show "LOCKED ???" |
| 2 | **3rd place** unlocks |
| 3 | **Champion and runner-up** unlock together, with pixel confetti and a trophy on 1st |

The podium is laid out 2nd – 1st – 3rd. Each revealed slot shows the avatar, the name and the points.

## How it works

- The server hides locked players: in the `finished` phase, `leaderboard` only contains visible ranks, and locked players in `participants` are sent as "Locked player" with no avatar or score (`finalRankVisible`). The podium can't be peeked at from the data.
- 1st and 2nd are revealed together so the runner-up doesn't give the champion away.

## Rules & edge cases

- Fewer than 3 players: empty slots show "NO PLAYER". Fewer than 4: "No players below the podium."
- Long names shrink on the podium (`podiumNameFontSize`, 8–16 px by length).
- Confetti only plays at stage 3 (`pixelConfettiBurst`), and respects reduced motion in `styles.css`.

## Entry points

- Player: `renderParticipantFinalReveal`; big screen: `renderDisplayFinalReveal` in `public/app.js`
- Shared parts: `participantPodiumSlot`, `participantFinalStandingsRows`, `pixelConfettiBurst`

## Under the hood

- Server: `finishQuiz`, `advanceFinalReveal`, `finalRankVisible`, `publicLeaderboard` in `server.js`
