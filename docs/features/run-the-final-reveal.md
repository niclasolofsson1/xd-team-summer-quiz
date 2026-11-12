# Run the final reveal

> **Host → stage panel after the last question**: unlock the final results in three steps, with a private preview of who's next.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | [watch the final podium](watch-the-final-podium.md) |

## What it is

After the last question the stage panel shows "Final results" and "Stage x of 3":

| Stage | Primary button | Host sees |
|---|---|---|
| 0 | **Start final reveal** (shows 4th place and down) | A note that the first step shows 4th place and down |
| 1 | **Reveal 3rd place** | Preview: the podium with 3rd place revealed |
| 2 | **Reveal champion** (1st and 2nd together) | Preview: the full podium |
| 3 | **Final reveal complete** (disabled) — "Use Reset in the menu when you're ready to start a new quiz." | The podium as everyone sees it |

The preview ("Preview of the next step · only on your screen", in a dashed frame) shows the podium as it will look after the next click, so the host can build up the moment ("…and in third place…"). It uses the shared podium with medals.

## How it works

- `POST /api/final-reveal` moves one stage forward (max 3). It's sent once, never retried automatically, so a stage can't be skipped.
- The preview comes from `POST /api/final-preview`, which needs the host PIN and returns the full, unhidden leaderboard. It's fetched again at each stage and laid out with the shared `finalLayout` (`client/src/shared/podium.js`) for the next stage.

## Rules & edge cases

- During the `finished` phase, the players panel shows "Locked player" with "?" and "—" for hidden ranks, since it uses the same public state as everyone else. Locked players aren't counted as offline.
- With fewer than 3 players, the empty places show "No player".
- **Shared ranks** (since v1.1.0): stages follow the rank, so two players sharing 1st both appear at stage 3, and a shared 3rd appears at stage 2. With ranks 1, 1, 3 there is no 2nd place.

## Entry points

- `client/src/host/FinalRevealPanel.jsx`; preview fetch in `client/src/host/App.jsx`; `previewStage` in `hostSteps.js`

## Under the hood

- Server: `advanceFinalReveal`, `finalPreviewState` in `server.js`
- Tests: `tests/e2e/host.spec.js` (full run through stage 3)
