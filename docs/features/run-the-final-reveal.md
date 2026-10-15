# Run the final reveal

> **Host → "Final Reveal" panel**: unlock the final results in three steps, with a private preview of who's next.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [watch the final podium](watch-the-final-podium.md) |

## What it is

After the last question the host's main area becomes the **Final Reveal** panel ("Stage x of 3"):

| Stage | Button | Host preview |
|---|---|---|
| 0 | **Start Final Reveal** (shows 4th place and down) | — |
| 1 | **Reveal 3rd Place** | The 3rd-place player |
| 2 | **Reveal Champion** (1st and 2nd together) | Champion and runner-up |
| 3 | — "Final reveal complete. Use Reset when you are ready to start a new quiz." | — |

The preview is only on the host's screen, so the host can build up the moment ("…and in third place…").

## How it works

- `POST /api/final-reveal` moves one stage forward (max 3).
- The preview comes from `POST /api/final-preview`, which needs the host PIN and returns the full, unhidden leaderboard.

## Rules & edge cases

- During the `finished` phase, the host's own participants list also shows "Locked player" for hidden ranks, since it uses the same public state as everyone else.
- With fewer than 3 players, the preview shows "No player".
- **Shared ranks** (since v1.1.0): stages follow the rank, so two players sharing 1st both appear at stage 3, and a shared 3rd appears at stage 2. With ranks 1, 1, 3 there is no 2nd place.

## Entry points

- `hostFinalRevealPanel`, `hydrateHostFinalPreview`, `hostFinalPreviewMarkup` in `public/app.js`

## Under the hood

- Server: `advanceFinalReveal`, `finalPreviewState` in `server.js`
