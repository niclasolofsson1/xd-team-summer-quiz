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
- Public URL: `https://xd-team-summer-quiz.onrender.com` (the arcade big screen's QR code is still hardcoded to it, see [Big screen](show-the-big-screen.md)). The server works out the join address itself: `GET /api/join-info`.
- **Exactly one instance.** All state is in memory in one process; a second instance would split the players.
- **Avoid plans that sleep or restart.** A restart wipes the quiz, like [Reset](reset-the-quiz.md).

## Environment variables

| Name | Required | What |
|---|---|---|
| `HOST_PIN` | Yes, for any public deployment | Protects host actions ([Unlock the host view](unlock-the-host-view.md)). Never commit the value. |
| `PUBLIC_URL` | No | The join address phones should use. If not set, the server uses the address the request came in on (on localhost: the laptop's network IP). |
| `PORT` | No | Port to listen on (Render sets it) |

Without `HOST_PIN`, anyone can control the quiz. Since v1.1.0 the server prints a warning at startup when it's missing.

## Static files

`serveStatic` in `server.js` serves `public/` with a type map (html, css, js, json, png, jpg, webp, svg, ico, woff, woff2). Paths outside `public/` get 403; missing files 404. Request bodies over 10 KB get 413, broken JSON 400.

## Event-day checklist

The README has the full checklist: deploy with `HOST_PIN`, one instance, test from a phone on mobile data, run all questions once, then reset right before the event.
