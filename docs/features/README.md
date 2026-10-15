# XD Team Quiz feature registry

A live, Kahoot-style quiz for a team event: players answer on their phones, the host runs it from a laptop, and a big screen shows the questions and results. The summer edition was themed around World Cup 2026 and its host countries (USA, Canada, Mexico) in a pixel-arcade style. Run it with `npm start` (see [Hosting](hosting.md)).

One page per thing you can do. **Before changing a feature, read its page.** When a change alters what a page says, update the page in the same commit.

Status: 🟢 Live · 🟡 Partial (works, with known issues) · ⚪ Planned

## Features

| Page | Who | Status | Since |
|---|---|---|---|
| [Join the quiz](join-the-quiz.md) | Player | 🟡 | v1-arcade-summer |
| [Answer a question](answer-a-question.md) | Player | 🟡 | v1-arcade-summer |
| [See if you were right](see-if-you-were-right.md) | Player | 🟢 | v1-arcade-summer |
| [Follow the leaderboard](follow-the-leaderboard.md) | Player | 🟢 | v1-arcade-summer |
| [Watch the final podium](watch-the-final-podium.md) | Player, Display | 🟢 | v1-arcade-summer |
| [Unlock the host view](unlock-the-host-view.md) | Host | 🟢 | v1-arcade-summer |
| [Set up the quiz](set-up-the-quiz.md) | Host | 🟢 | v1-arcade-summer |
| [Run a question](run-a-question.md) | Host | 🟢 | v1-arcade-summer |
| [Run the final reveal](run-the-final-reveal.md) | Host | 🟢 | v1-arcade-summer |
| [Reset the quiz](reset-the-quiz.md) | Host | 🟢 | v1-arcade-summer |
| [Show the quiz on the big screen](show-the-big-screen.md) | Display | 🟢 | v1-arcade-summer |

## Across features

- [Live updates and connection](live-updates-and-connection.md): how every screen stays in sync, heartbeat, reconnects
- [Scoring](scoring.md): points, speed bonus, ranking and ties
- [Writing questions](writing-questions.md): the Markdown format and the two question sets
- [Hosting](hosting.md): running locally, Render, `HOST_PIN`, one instance
- [Conventions](conventions.md): code layout, rendering, copy, assets, git
- [Glossary](glossary.md): phases, stages and other terms

## Discrepancies (for the user to decide)

Found in the code review of 2026-10-15. Each is in scope for v2 (`ux-forge/01_frame.md`) unless noted.

1. **Typed name is wiped on the setup screen.** Every server update redraws the whole screen, so when anyone else joins, a half-typed name disappears ([Join the quiz](join-the-quiz.md)). Live-event bug.
2. **A silent connection drop is never recovered.** After 45 s without data the client only relabels itself "Offline"; it never reopens the connection. Players don't see a connection indicator at all ([Live updates](live-updates-and-connection.md)). Likely cause of the "stuck player" at the live event.
3. **A failed answer send is silent.** The phone shows the answer as chosen even if the server never got it ([Answer a question](answer-a-question.md)).
4. **What's shown can differ from what's scored.** Each answer from anyone redraws the question screen and re-enables the buttons until the player's own answer is confirmed; a second tap changes the highlighted option, but the server scores the first.
5. **Missed answers say "Incorrect".** A player who didn't answer sees "Incorrect · 0 points" ([See if you were right](see-if-you-were-right.md)).
6. **QR code and join link are hardcoded** to `https://xd-team-summer-quiz.onrender.com/` (`deployedJoinUrl` and `assets/qr/qr-code.svg`) — wrong for any other address ([Big screen](show-the-big-screen.md)).
7. **Player ids are public.** Every screen receives every player's id, and the id is all `/api/answer` checks, so anyone could answer for someone else.
8. **Scores update at answer time.** The broadcast state shows score changes during the answer window, so correctness can be read from the raw data before the reveal (only with developer tools).
9. **No `HOST_PIN` = open host controls.** The server doesn't warn at startup when it's missing ([Hosting](hosting.md)).
10. **Defaults to the test questions**, and Reset goes back to them ([Set up the quiz](set-up-the-quiz.md)).
11. **Ties get different ranks**, ordered by name ([Scoring](scoring.md)). To decide in L2.
12. **Answer values aren't validated**, and request bodies have no size limit (`answerQuestion`, `readBody` in `server.js`).
13. **`.woff2` is served as `application/octet-stream`** (`serveStatic`).
14. **Dead code and files:** `header()`, `participantMain()`, `countdownBlock()` on the player side and the fallback branch of `renderParticipant()` never run; `public/index.html` (old landing page) is unreachable because `/` redirects to the player page; ~29 unused assets, mostly PNG duplicates of WebP files (~13 MB).
15. **README is outdated** (says 3 questions, questions in `server.js`, QR code still to come).
16. **Question content** (`questions/real.md`, replaced later anyway): Q25 is football trivia filed under "Mexico"; Q6 has two UNESCO sites among the options; Q23's "continental" southernmost point is disputed.

---

*Current through v1-arcade-summer.*
