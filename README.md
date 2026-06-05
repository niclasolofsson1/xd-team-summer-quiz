# XD Team Summer Gathering Quiz

Mobile-first live quiz for an Ericsson Team Summer Gathering, themed around World Cup 2026 and the host countries USA, Canada, and Mexico.

## Run

```powershell
npm start
```

On Windows, you can also double-click:

```text
start-server.bat
```

If you prefer using the launcher directly:

```powershell
.\start-server.ps1
```

Then open:

- Host view: `http://localhost:4173/host.html`
- Participant view on the host machine: `http://localhost:4173/participant.html`

For phones, use the participant link printed in the terminal. Phones must be on the same network as the host machine. The root URL redirects to the participant view.

## Public Event Deployment

For participants joining over 5G or from another country, deploy this as a single public Node web service rather than static hosting.

Recommended deployment shape:

- Runtime: Node.js web service
- Start command: `npm start`
- Instances: 1
- Required event environment variable: `HOST_PIN`
- Optional environment variable: `PORT`

Use the public URL like this:

- Host view: `https://your-event-url/host.html`
- Participant view: `https://your-event-url/participant.html`

Only share the participant link with attendees. Future QR codes should point to `/participant.html`, not `/`. When `HOST_PIN` is configured, the host view shows a PIN gate before the dashboard is visible. The configured `HOST_PIN` stays on the server and is not exposed to the frontend or public quiz state.

Avoid hosting plans that sleep or restart during the gathering. If the server restarts, the quiz resets because state is intentionally kept in memory for this lightweight event version.

## Render Deployment

- Repo root folder: `C:\Users\nicla\OneDrive\XD Team Summer Gathering Quiz`
- Render service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Required environment variable: `HOST_PIN`
- Participant URL: `/participant.html`
- Host URL: `/host.html`

Do not commit the real `HOST_PIN`. Set it only as an environment variable in Render.

## Current Prototype

- Individual participants join with a display name.
- Host starts and controls the quiz.
- Each question starts with a 3-second countdown before the question and answers appear together.
- Participants answer four-option questions from their phones.
- Missed or wrong answers score 0 points.
- Correct answers score up to 1000 points, with faster answers scoring higher.
- Host reveals the correct answer.
- Host shows the running leaderboard after non-final questions.
- After the final question, host reveals the final results instead of the running leaderboard.
- Prototype quiz length is currently 3 questions for faster testing.

## Notes

- The current join flow uses a shareable participant link. A scannable QR code can be added once the core flow is reviewed.
- Participant links and QR codes should use `/participant.html`.
- The quiz data is fixed in `server.js` for the prototype.
- No accounts or persistent storage are included.
- Host-only actions are protected by `HOST_PIN` when that environment variable is set.
- Live updates use Server-Sent Events with a heartbeat. The UI shows a small connection status.

## Event-Day Test Checklist

Before the real session:

- Deploy with `HOST_PIN` set.
- Confirm the service is running as one instance.
- Open `/host.html`, enter the host PIN, and confirm host controls work.
- Open `/participant.html` from the host machine.
- Join from at least one phone on 5G, not the same Wi-Fi.
- Ask the Canada participant to join a rehearsal if possible.
- Run through all questions once.
- Confirm answers, reveal, leaderboard, next question, final results, and reset all work.
- Watch that host and participant pages show `Connected`.
- Reset the quiz immediately before the live event.
- Keep a backup plan ready: local same-network hosting or a tunnel if the public service has issues.
