# L1 Frame: XD Team Quiz v2 (Carbon)

Approved 2026-10-15 (Lite track).

## 1. Goal

Rebuild the summer quiz as **v2**: same game, a new clean UI based on **IBM Carbon**, and **stable enough to run live with no stuck players**. Ready well before the work Christmas party (December 2026, exact date to be confirmed). A Christmas theme comes later, as its own step once the Carbon base is in place.

## 2. Users and setup

| Who | Device | Needs |
|---|---|---|
| **Players** (20–25, mixed football interest) | Own phones; mostly in the room, possibly some remote over mobile data | Join in under 30 seconds from the QR code, answer easily, never get stuck |
| **Host** (Niclas) | Laptop | Confidence: one clear next action, see who's connected and who has answered, no surprises |
| **Audience display** | Projector or TV in the room | Readable from across the room: question, timer, reveal, leaderboard, podium |

## 3. What stays the same

- Players join with a name and an avatar. Joining is only possible in the lobby.
- The host picks the question set and the answer time (5–30 seconds), then starts the quiz.
- Each question has a 3-second countdown, then the question and four options.
- Scoring: wrong or missed = 0; correct = 250–1000 points, more for faster answers.
- The host reveals the answer, shows the leaderboard, and moves to the next question.
- Staged final reveal: 4th place and below, then 3rd, then 1st and 2nd together, with a private preview for the host.
- Host PIN, audience display with QR code, Reset.
- Questions in Markdown files, same format as now.
- The server and the live-update setup (Server-Sent Events) stay as they are.

## 4. What changes

- **New UI:** Carbon design on the player, host and display screens. No pixel art.
- **Stability:** the fixes in section 5.
- **Avatars:** the pixel avatars go and need a replacement (decided in L2).
- **Small fixes from the review:** a player who doesn't answer sees "No answer" instead of "Incorrect"; answer values are checked on the server; the QR code and join link come from the actual address the quiz runs on; the outdated README is updated.
- **Feature wiki in `docs/features/`, in the same format as Rinkside:** a registry `README.md` plus one page per thing you can do (player, host, display) and cross-feature pages (live updates and connection, scoring, writing questions, hosting, conventions, glossary), and a Discrepancies section for open review findings.

## 5. What "stable" means (each item gets tested)

| # | Check |
|---|---|
| S1 | A name being typed or an avatar being chosen is **never cleared**, whatever else happens. |
| S2 | A phone that sleeps or loses its connection **reconnects by itself** and lands on the right current screen. |
| S3 | Players can **see their connection status**, and it's clear when they're offline. |
| S4 | An answer only shows as "locked" once **the server has received it**. A failed send is retried, and if it still fails the player is told. |
| S5 | **The answer the player sees as chosen is always the one that's scored.** |
| S6 | A player who refreshes or reopens the page on the same phone **stays in the game**. |
| S7 | A full run with **25 simulated players** finishes with no errors and no stuck players. |
| S8 | A **rehearsal on real phones** before the event shows the same result. |
| S9 | In the deployed version, the **host PIN is required**, and the hosting doesn't sleep or restart during the event. |

## 6. Out of scope for v2

The Christmas theme, new question content, teams, accounts, saving results after the quiz, multiple quiz rooms at once, and big new features.

## 7. Assumptions and risks

- **Build approach:** React + Carbon's React components (`@carbon/react`), with a build step. Recommended in the consultation; confirmed in L2.
- **Risk: Carbon's defaults are made for office tools.** Answer buttons and the big screen need larger sizes than Carbon's defaults. Handled in L2.
- **Risk: an IBM look.** Override the font and accent colour so it doesn't read as an IBM product.
- **Risk: hosting.** A sleeping or restarting server loses the whole quiz. Check the Render plan before the event.
- **Risk: corporate Wi-Fi** can interfere with live connections. Test on the venue network or mobile data during the rehearsal.

## 8. To decide in L2

- What replaces the avatars.
- How tied scores are ranked.
- Whether the timer ends early once everyone has answered.
- Whether a player can rejoin from a different device.

## 9. How the work is organised

- Work happens on the `v2-carbon` branch in this repo. `main` stays the arcade version until v2 is released. The arcade version is also preserved under the tag `v1-arcade-summer` (pushed to GitHub).
- UX Forge files live in `ux-forge/` in this repo: a deliberate exception to the usual `~/dev/` location, since the project already lives here.
- The wiki is written first, describing the arcade version as it is ("Current through v1-arcade-summer"), so v2 has a written checklist of everything it must keep. Every v2 version that changes a feature updates that page in the same commit.
- L2 builds on Rinkside's Carbon conventions (read from that repo; nothing copied here without the user's OK).
