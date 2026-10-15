# Join the quiz

> **Player → welcome screen → "Choose your Character" → waiting screen**: pick a name and an avatar, then wait for the host.

| Status | Since | Depends on |
|---|---|---|
| 🟡 Partial (name can be wiped, see Rules) | v1-arcade-summer | [live updates](live-updates-and-connection.md) |

## What it is

Players scan the QR code on the big screen (or open the link) and land on `/participant.html`. The **welcome screen** shows the quiz logo and a start button. The **setup screen** has a name field (max 28 characters) and a grid of 9 avatars, three per host country: Eagle, Hot dog, Statue (USA); Beaver, Maple leaf, Moose (Canada); Cactus, Chili, Taco (Mexico). "Enter Lobby" joins. The **waiting screen** says "You are in as <name>", shows the avatar and "Waiting for host".

## How it works

- `POST /api/join` with `name` and `avatarId`. The server trims the name, cuts it at 28 characters, and returns a public **id** (`crypto.randomUUID()`) plus a secret **token** that only this phone knows. The token is needed to answer and is never sent to other screens.
- The phone keeps the id and token in `localStorage` (`xd-summer-quiz-participant-id`, `xd-summer-quiz-participant-token`) and reopens its live stream with the token, so the server knows the player is connected. On every update the client looks itself up in the player list by the id.
- If the id isn't in the list (after a reset or a server restart), the phone goes back to the welcome screen.
- Images for the next screen are preloaded while the current one shows (`queueParticipantPreload`).

## Rules & edge cases

- New players can **only join in the lobby**. Later: "The quiz has started. Playing already? Enter the same name to rejoin."
- Empty name: "Enter a name." Same name as a player who is **connected** (case-insensitive): "That name is already taken."
- An unknown avatar id falls back to Eagle (`normalizeAvatarId`).
- Refreshing on the same phone keeps you in the game (same id and token). **Rejoin by name** (since v1.1.0): entering the exact name of a player who is *disconnected* takes over that player, score included, in any phase. The server issues a new token, so the old device can no longer answer.
- **Known bug:** the setup screen is redrawn on every server update, so when someone else joins (or the host changes a setting) the name you're typing is cleared. The chosen avatar survives because it's kept in a variable (`selectedAvatarId`). See Discrepancies 1 in the [registry](README.md).

## Entry points

- Page: `public/participant.html` (`data-view="participant"`); `/` redirects here
- Screens: `renderWelcome`, `renderPlayerSetup`, `renderParticipantWaiting` / `waitingForHostScreen` in `public/app.js`
- Avatars: `avatars` list in `public/app.js`, `AVATAR_IDS` in `server.js`, images in `public/assets/avatars/*.webp`

## Under the hood

- Server: `join()`, `normalizeAvatarId()` in `server.js`
- Routing between screens: `renderParticipant()` → `renderPreJoin()` (step kept in `participantPreJoinStep`)
