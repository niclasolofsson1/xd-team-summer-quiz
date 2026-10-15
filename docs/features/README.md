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
5. ✅ *Fixed in v1.1.0.* **Missed answers say "Incorrect".** A player who didn't answer saw "Incorrect · 0 points". Now "No answer" ([See if you were right](see-if-you-were-right.md)).
6. **QR code and join link are hardcoded** to `https://xd-team-summer-quiz.onrender.com/` (`deployedJoinUrl` and `assets/qr/qr-code.svg`) — wrong for any other address ([Big screen](show-the-big-screen.md)). *Server side fixed in v1.1.0* (`/api/join-info`); the big screen uses it from v1.4.0.
7. ✅ *Fixed in v1.1.0.* **Player ids are public.** Ids are still shared, but answering now needs a secret token only the player's phone has.
8. ✅ *Fixed in v1.1.0.* **Scores update at answer time.** Scores and answers now stay hidden until the reveal.
9. ✅ *Fixed in v1.1.0.* **No `HOST_PIN` = open host controls.** The server now warns at startup ([Hosting](hosting.md)); the PIN check is timing-safe.
10. **Defaults to the test questions**, and Reset goes back to them ([Set up the quiz](set-up-the-quiz.md)).
11. ✅ *Fixed in v1.1.0.* **Ties get different ranks.** Now: faster total time on correct answers wins, otherwise a shared rank ([Scoring](scoring.md)).
12. ✅ *Fixed in v1.1.0.* **Answer values aren't validated**, and request bodies have no size limit. Now only 0–3 is accepted and bodies are capped at 10 KB.
13. ✅ *Fixed in v1.1.0.* **`.woff2` was served as `application/octet-stream`.** Now `font/woff2`.
14. **Dead code and files:** `header()`, `participantMain()`, `countdownBlock()` on the player side and the fallback branch of `renderParticipant()` never run; `public/index.html` (old landing page) is unreachable because `/` redirects to the player page; ~29 unused assets, mostly PNG duplicates of WebP files (~13 MB).
15. **README is outdated** (says 3 questions, questions in `server.js`, QR code still to come).
16. **Question content** (`questions/real.md`, replaced later anyway): Q25 is football trivia filed under "Mexico"; Q6 has two UNESCO sites among the options; Q23's "continental" southernmost point is disputed.

---

*Current through v1.1.0.*
