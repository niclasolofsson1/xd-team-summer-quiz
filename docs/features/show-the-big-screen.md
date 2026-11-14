# Show the quiz on the big screen

> **Host → "Open display screen" → `/display.html` on the projector or TV**: the shared screen everyone in the room watches.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · Carbon big screen v1.4.0 | [live updates](live-updates-and-connection.md) |

## What it is

A screen with no controls, made for a 16:9 projector or TV (Carbon Gray 100, dark). It follows the quiz by itself. A top bar shows "XD Team Quiz" on the left and the quiz status on the right.

| Phase | Big screen shows | Top bar (right) |
|---|---|---|
| `lobby` | "Join on your phone", a **QR code drawn from the real join address** (white card), the address in large type, "Scan the code or type the address. Same Wi-Fi as the host.", and the player wall (avatar + name chips, newest pops in). Before anyone joins: "No one has joined yet. Players appear here as they join." | "22 players" |
| `countdown` | "Question 3 of 25", a huge countdown number, "Get ready" | Question number, players |
| `answering` | The question (display size), four answer tiles in a 2×2 grid with the phones' colours and letters, the timer bar with the seconds | Question number, **"14 of 22 answered"** |
| `awaitingReveal` | The same tiles, faded back; where the timer was: **"Time's up!"** · "Waiting for the host to reveal the answer." | Same |
| `reveal` | The correct answer in full colour with a white frame and a "✓ Correct" tag; the others as dark tiles with a strip of their colour on the left; the picks per answer on the right of each tile. Underneath: "12 of 20 got it right" · "2 players didn't answer." | Same |
| `leaderboard` | "Leaderboard" · "After question 3 of 25", the top 10 (rank, avatar, name, points) | Question number, players |
| `finished` | The staged podium ([Watch the final podium](watch-the-final-podium.md)) with the final standings beside it | Players |

## How it works

- Same live connection as the phones and the host (`useQuizState`, no player token): watchdog, reconnect with backoff, back-in-foreground check. While the connection is down the top bar shows a grey **"Reconnecting…"** tag, then a red **"Connection lost"** tag; it keeps trying in the background and the tag goes away when it's back.
- The join address comes from `GET /api/join-info` (retried every 5 s until it arrives) and is shown without `http://` and the trailing slash. The QR is drawn in the browser (`qrcode` library, error correction M) as one SVG path, so it stays sharp at any size.
- **Display-size type that scales with the screen:** 1 rem = 1/45 of the screen height (or 1/80 of the width, whichever is smaller), so 16 px at 1280×720 and 24 px at 1920×1080. Carbon's type and component sizes are in rem, so everything scales together and the layout is the same at every 16:9 size.
- **Never scrolls.** The lobby wall shows up to 28 players (4 columns × 7 rows), then 27 and "+N more". The final standings show 9 rows, then "and N more players". Long names end with "…" on the wall and the leaderboard.
- Questions over 90 characters step down one type size (same rule as the phones).
- The host opens it from the join panel ("Open display screen"), usually in a second window dragged to the projector, then full screen (F11).

## Rules & edge cases

- Reduced motion turns off the player-chip pop, the countdown pop, the podium slide and the confetti. The timer bar still drains (it shows the time left).
- Nothing on the screen can be clicked, so there are no focus rings. Phase changes are announced in a polite live region for screen readers.
- No "you" on this screen: the reveal shows no player's own pick, the leaderboard pins no row.
- Before the first state arrives it shows "Connecting…".

## Entry points

- Page: `client/display.html`, built to `dist/display.html`
- `client/src/display/App.jsx` (phase routing, join address), `TopBar.jsx`, `QrCode.jsx`, `Confetti.jsx`, `screens/` (`Lobby`, `Countdown`, `Question` incl. Time's up, `Reveal`, `Leaderboard`, `Final`)
- Shared parts: `AnswerTile`, `TimerBar`, `Leaderboard`, `Podium`, `Avatar` from `client/src/shared/components/`

## Under the hood

- Styles: `client/src/display/display.scss` (g100 theme, rem layout, big-screen sizes of the shared parts)
- Plain logic: `client/src/display/displayView.js` (top-bar text, reveal summary, what fits on the wall and in the standings, join address text); tests in `tests/unit/display.test.js`
- E2E: `tests/e2e/display.spec.js` (QR and address, a whole quiz, no scrolling at 1280×720 and 1920×1080 in every phase, standings with 22 players, confetti)
- Mockup approved by the user: `ux-forge/mockups/v1.4.0-display.html`
- The arcade big screen (`public/display.html`, `public/app.js`, pixel assets) was removed in v1.4.0 and is preserved in tag `v1-arcade-summer`.
