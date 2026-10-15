# Show the quiz on the big screen

> **Host → "Open display screen" → `/display.html` on the projector**: the shared screen everyone in the room watches.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer | [live updates](live-updates-and-connection.md) |

## What it is

A view with no controls, meant for a projector or TV. It follows the quiz automatically:

| Phase | Big screen shows |
|---|---|
| `lobby` | "Join on your phone", the **QR code and join URL**, "x players joined", and a grid of joined players (avatar + name) |
| `countdown` | "Question x of y · Get ready" with the number |
| `answering` | The question, the four options and a timer bar |
| `awaitingReveal` | The question and "Time's up · Waiting for host to reveal the answer" |
| `reveal` | The correct option highlighted, the others dimmed, and how many picked each |
| `leaderboard` | "Current standings · Leaderboard" with rank, avatar, name and points |
| `finished` | The staged podium ([Watch the final podium](watch-the-final-podium.md)) |

## How it works

- Same `app.js` and live updates as the other views (`data-view="display"`).
- The host opens it from the "Join the Quiz" card, usually in a second window dragged to the projector.

## Rules & edge cases

- **The QR code is a fixed image** (`public/assets/qr/qr-code.svg`) and the shown URL is hardcoded (`deployedJoinUrl` = `https://xd-team-summer-quiz.onrender.com/`). Running anywhere else needs a new QR image and a code change (Discrepancies 6).
- The display doesn't show the category or a numeric timer during answering, only the bar.
- No connection indicator on the big screen.

## Entry points

- Page: `public/display.html`
- `renderDisplay` and `renderDisplayLobby`, `renderDisplayCountdown`, `renderDisplayQuestion`, `renderDisplayTimeUp`, `renderDisplayReveal`, `renderDisplayLeaderboard`, `renderDisplayFinalReveal` in `public/app.js`

## Under the hood

- Background: `public/assets/display-screen/display-bg.webp`
