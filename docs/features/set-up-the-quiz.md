# Set up the quiz

> **Host → lobby → "Set up the quiz"**: choose which questions to play and how long players get, share the join link, then start.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) · v1.3.1 (redesign) | [writing questions](writing-questions.md), [unlock the host view](unlock-the-host-view.md) |

## What it is

Since v1.3.1 the lobby leads with the join address. On a laptop (from 1024 px) it has a main area on the left and one control column on the right (Carbon's 2x Grid: 10 + 6 of 16 columns), filling the screen height:

- **Join panel** (top left): "Players join on their phones at" and the address (from `/api/join-info`) in large type, with **Copy link** (shows "Copied" for 2 s) and **Open display screen** (opens `/display.html` in a new tab).
- **Player wall** (below it): everyone who joined as a large avatar with their name, the newest one ringed in blue, and "x joined". Before anyone joins it shows an empty state: placeholder seats, **"Waiting for the first player"** and what to do.
- **Control column** (right): "Lobby", the heading **"Set up the quiz"** (or "x players joined"), then
  - **Question set:** a Carbon Select, "Test questions (n questions)" / "Real questions (n questions)".
  - While the test set is selected, a low-contrast note: **"You're about to run the test questions."**
  - **Answer time:** 5, 10, 15, 20 or 30 seconds.
  - A line above the button: "Start unlocks when the first player joins." or, once someone has joined, "Test questions · 3 questions · 15 s each".
  - **Start quiz**, the one primary button, across the full width of the column.

Below 1024 px the panels stack: join, control, then the wall.

## How it works

- `POST /api/set-question-set` (`questionSetId`) and `POST /api/set-answer-time` (`answerSeconds`) are sent as soon as a different option is picked. The fields show the server's state, so a second host tab stays in step.
- The server accepts any whole number of seconds from 5 to 30; the UI offers five presets (another value set on the server is added to the list).
- **Start quiz** sends `POST /api/start` ([Run a question](run-a-question.md)). It stays visible but disabled until a player has joined, with the line "Start unlocks when the first player joins." (Carbon's rule for a control that's only disabled for now).

## Rules & edge cases

- Defaults: **Test questions, 15 s**. Reset goes back to these defaults (Discrepancies 10).
- Settings can't be changed once the quiz has started ("Question set can only be changed in the lobby." / "Answer time can only be changed in the lobby."); the setup fields only show in the lobby.
- The join address is `PUBLIC_URL` if set, else the request host; on localhost, the laptop's network address.

## Entry points

- `client/src/host/SetupFields.jsx`, `JoinPanel.jsx`, `PlayerWall.jsx`, `ControlPanel.jsx`; layout in `App.jsx` and `host.scss`; step text in `client/src/host/hostSteps.js`

## Under the hood

- Server: `setQuestionSet`, `setAnswerTime`, `startQuiz`, `joinUrl`; limits `MIN_ANSWER_MS`, `MAX_ANSWER_MS`, `DEFAULT_ANSWER_MS` in `server.js`
- Tests: `tests/e2e/host.spec.js` ("lobby")
