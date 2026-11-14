# Hosting

## Running locally

- First time: `npm install` (Node 20.19 or newer).
- `npm run build`, then `npm start`. Or double-click `start-server.bat` / run `start-server.ps1`, which build and then start. The server warns at startup if the player app isn't built.
- Listens on port **4173** (`PORT` to change it), on all network interfaces.
- The terminal prints the host link (`http://localhost:4173/host.html`) and a player link with the machine's local IP, for phones on the same network.

## URLs

| URL | What |
|---|---|
| `/participant.html` (and `/`, which redirects there) | Players (Carbon app, from `dist/`) |
| `/host.html` | Host dashboard (Carbon, from `dist/`, since v1.3.0) |
| `/display.html` | Big screen (Carbon, from `dist/`, since v1.4.0) |

## Developing

`npm run dev` starts the quiz server (port 4173, restarts on changes to `server.js`) and the Vite dev server (port 5173) together. Vite passes `/api` and `/events` through to the quiz server.

- Player: `http://localhost:5173/participant.html` (reloads on change; phones on the same network can use the laptop's IP with port 5173)
- Host: `http://localhost:5173/host.html` (Carbon, since v1.3.0)
- Big screen: `http://localhost:5173/display.html` (Carbon, since v1.4.0)

Tests: `npm test` (server tests and unit tests), `npm run test:e2e` (Playwright: builds, starts the server on port 4199 and plays the player flow on a phone-sized browser the host flow at 1280×800 and the big screen at 1280×720 and 1920×1080; needs `npx playwright install chromium` once), `npm run simulate` (25 simulated players through the real quiz).

## Public deployment (Render, used at the Summer Gathering)

- Service type: Web Service. **Build command `npm install && npm run build`** (since v1.2.0), start command `npm start`.
- The build needs the dev dependencies (Vite, Sass). Don't set `NODE_ENV=production` for the install step, or `npm install` skips them and the build fails.
- Public URL: `https://xd-team-summer-quiz.onrender.com`. The server works out the join address itself (`GET /api/join-info`); the big screen draws its QR code from it. Set `PUBLIC_URL` to this address on Render.
- **Exactly one instance.** All state is in memory in one process; a second instance would split the players.
- **Avoid plans that sleep or restart.** A restart wipes the quiz, like [Reset](reset-the-quiz.md).

## Environment variables

| Name | Required | What |
|---|---|---|
| `HOST_PIN` | Yes, for any public deployment | Protects host actions ([Unlock the host view](unlock-the-host-view.md)). Never commit the value. |
| `PUBLIC_URL` | No | The join address phones should use. If not set, the server uses the address the request came in on (on localhost: the laptop's Wi-Fi/LAN address, see below). |
| `PORT` | No | Port to listen on (Render sets it) |

**Join address on a laptop (since v1.4.0):** when the server runs locally, it picks the laptop's private LAN address in this order: `192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`, then any other address; VPN addresses such as Tailscale (`100.64.0.0/10`) and link-local (`169.254.x.x`) come last, so phones on the Wi-Fi get an address they can reach (`lan-address.js`; it used to take the first address, which could be the VPN). `PUBLIC_URL` always wins.

Without `HOST_PIN`, anyone can control the quiz. Since v1.1.0 the server prints a warning at startup when it's missing.

## Static files

`serveStatic` in `server.js` serves **`dist/` only** (the built Carbon apps and the favicon from `client/public/`; `QUIZ_DIST_DIR` overrides it, for tests). The arcade `public/` folder was removed in v1.4.0 (kept in tag `v1-arcade-summer`). Type map (html, css, js, json, png, jpg, webp, svg, ico, woff, woff2). Built files live under `/app/` with a content hash in their names and are cached for a year; pages are sent with `no-cache` so a new build is picked up at once. Paths outside the folder get 403; missing files 404. Request bodies over 10 KB get 413, broken JSON 400.

## Event-day checklist

The README has the full checklist: deploy with `HOST_PIN`, one instance, test from a phone on mobile data, run all questions once, then reset right before the event.
