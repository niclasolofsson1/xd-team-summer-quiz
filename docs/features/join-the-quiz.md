# Join the quiz

> **Player → "Join the quiz" → "You're in, {name}!"**: enter a name, pick an avatar, then wait for the host.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon player app v1.2.0 | [live updates](live-updates-and-connection.md) |

## What it is

Players scan the QR code on the big screen (or open the link) and land on `/participant.html`. Since v1.2.0 welcome and setup are **one Join screen**: "Join the quiz", a **"Your name"** field (max 28 characters), **"Pick an avatar"** with 12 emoji avatars on coloured circles (fox, panda, frog, owl, octopus, lion, penguin, koala, tiger, bear, rabbit, cow) and **Join**. The **lobby** then shows the avatar, "You're in, {name}!", "Waiting for the host to start." and "{n} players joined".

## How it works

- `POST /api/join` with `name` and `avatarId`. The server trims the name, cuts it at 28 characters, and returns a public **id** plus a secret **token** that only this phone knows. The token is needed to answer and is never sent to other screens. A dropped join request is retried (`postWithRetry`); a retry that arrives after a successful first try is a rejoin, so it returns the same player.
- The phone keeps `{ id, token, name }` in `localStorage` (`xd-quiz-player`) and reopens its live stream with the token, so the server knows the player is connected. It finds itself in the player list by the id.
- The name last used is remembered separately (`xd-quiz-last-name`) and filled in on the Join screen, also after a reset.
- If the id isn't in the list on the player's own stream (after a reset or a server restart), the phone goes back to Join with "The quiz was reset. Join again to play."
- Avatars come from one data file, `client/src/shared/avatars.json`, which the server reads too; a themed set is a swap of that file.

## Rules & edge cases

- New players can **only join in the lobby**. Once the quiz has started the Join screen says so up front: "The quiz has started. Playing already? Enter the same name to rejoin."
- Empty name: "Enter a name." (checked on the phone). Same name as a player who is **connected** (case-insensitive): "That name is already taken." Both show on the name field.
- An unknown avatar id falls back to the fox (`normalizeAvatarId`). The arcade ids are still accepted until the arcade screens go (v1.4.0).
- Refreshing on the same phone keeps you in the game (same id and token). **Rejoin by name** (since v1.1.0): entering the exact name of a player who is *disconnected* takes over that player, score included, in any phase. The server issues a new token, so the old device can no longer answer (it is sent back to Join if it tries).
- **The typed name is never cleared** by live updates (fixed in v1.2.0, Discrepancies 1): the field belongs to the Join screen alone.
- The host app (since v1.3.0) uses the shared avatars; the arcade big screen shows them too (`avatarSrc` in `public/app.js`, a temporary copy of the list, until v1.4.0).

## Entry points

- Page: `client/participant.html` → built to `dist/participant.html`; `/` redirects here
- Screens: `client/src/participant/screens/Join.jsx`, `Lobby.jsx`; routing in `client/src/participant/App.jsx`
- Avatars: `client/src/shared/avatars.json`, `avatars.js`, `components/Avatar.jsx`

## Under the hood

- Server: `join()`, `normalizeAvatarId()`, `AVATARS` in `server.js`
- Storage: `client/src/shared/storage.js`
- e2e: `tests/e2e/player.spec.js` (S1: the name survives 20 other players joining; join errors; rejoin; reset)
