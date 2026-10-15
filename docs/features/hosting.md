# Hosting

## Running locally

- `npm start` (or double-click `start-server.bat`, or run `start-server.ps1`). Node only, no dependencies to install.
- Listens on port **4173** (`PORT` to change it), on all network interfaces.
- The terminal prints the host link (`http://localhost:4173/host.html`) and a player link with the machine's local IP, for phones on the same network.

## URLs

| URL | What |
|---|---|
| `/participant.html` (and `/`, which redirects there) | Players |
| `/host.html` | Host dashboard |
| `/display.html` | Big screen |

## Public deployment (Render, used at the Summer Gathering)

- Service type: Web Service. Build command `npm install`, start command `npm start`.
- Public URL: `https://xd-team-summer-quiz.onrender.com` (also hardcoded in the big screen's QR code, see [Big screen](show-the-big-screen.md)).
- **Exactly one instance.** All state is in memory in one process; a second instance would split the players.
- **Avoid plans that sleep or restart.** A restart wipes the quiz, like [Reset](reset-the-quiz.md).

## Environment variables

| Name | Required | What |
|---|---|---|
| `HOST_PIN` | Yes, for any public deployment | Protects host actions ([Unlock the host view](unlock-the-host-view.md)). Never commit the value. |
| `PORT` | No | Port to listen on (Render sets it) |

Without `HOST_PIN`, anyone can control the quiz, and the server doesn't warn about it (Discrepancies 9).

## Static files

`serveStatic` in `server.js` serves `public/` with a small type map (html, css, js, png, webp, svg). Paths outside `public/` get 403; missing files 404. Fonts (`.woff2`) aren't in the map (Discrepancies 13).

## Event-day checklist

The README has the full checklist: deploy with `HOST_PIN`, one instance, test from a phone on mobile data, run all questions once, then reset right before the event.
