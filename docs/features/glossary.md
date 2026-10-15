# Glossary

| Term | Meaning |
|---|---|
| **Player** / participant | Someone playing on their phone (`participants` in the state). |
| **Host** | The person running the quiz from `/host.html`. |
| **Display** / big screen | `/display.html` on a projector or TV. No controls. |
| **Phase** | Where the quiz is: `lobby` → `countdown` → `answering` → `awaitingReveal` → `reveal` → `leaderboard` → (next question) … → `finished`. |
| `lobby` | Before the start. The only phase where players can join and settings can change. |
| `countdown` | The 3-second "Get ready" before each question. |
| `answering` | The answer window. Ends after the answer time, or earlier when every player has answered. |
| `awaitingReveal` | "Time is up": answers closed, waiting for the host to reveal. |
| `reveal` | The correct answer and per-option counts are shown. |
| `leaderboard` | Running standings between questions (not after the last one). |
| `finished` | The final results, revealed in stages. |
| **Final reveal stage** | 0–3 inside `finished`: locked → 4th and down → 3rd → 1st and 2nd. |
| **Question set** | One Markdown file of questions: Test or Real. |
| **Answer time** | How long the answer window lasts (5–30 s, default 15 s). |
| **Host PIN** | `HOST_PIN` environment variable; protects host actions. |
| **Player id** | Public random id from the server at join, kept in the phone's `localStorage`. |
| **Player token** | Secret from the server at join, known only to that phone; needed to answer and to show as connected. |
| **SSE** | Server-Sent Events: the one-way live stream (`/events`) the server uses to push the state. |
| **Heartbeat** | A small message every 10 s that keeps the stream alive and tells clients they're connected. |
| **Broadcast** | Sending the full public state to every open stream after a change. |
| **`v1-arcade-summer`** | Git tag for the pixel-arcade version as played at the Summer Gathering. |
