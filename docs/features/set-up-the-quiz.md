# Set up the quiz

> **Host → lobby → "Set up the quiz"**: choose which questions to play and how long players get, share the join link, then start.

| Status | Since | Depends on |
|---|---|---|
| 🟢 Live | v1-arcade-summer · v1.3.0 (Carbon) | [writing questions](writing-questions.md), [unlock the host view](unlock-the-host-view.md) |

## What it is

In the lobby the host dashboard shows, under the stage panel ("Waiting for players" / "x players joined" and **Start quiz**):

- **Set up the quiz**
  - **Question set:** a switcher between "Test questions (n)" and "Real questions (n)".
  - While the test set is selected, a warning: **"You're about to run the test questions."**
  - **Answer time:** 5 s, 10 s, 15 s, 20 s or 30 s.
- **Join the quiz:** the address players open (from `/api/join-info`) with a **Copy** button, "x players joined", and **Open display screen** (opens `/display.html` in a new tab).
- The **Players** panel on the right ([Run a question](run-a-question.md)).

The header always shows the question set as a tag (magenta for the test set), so the host can see which set is live.

## How it works

- `POST /api/set-question-set` (`questionSetId`) and `POST /api/set-answer-time` (`answerSeconds`) are sent as soon as a switch is clicked. The switchers show the server's state, so a second host tab stays in step.
- The server accepts any whole number of seconds from 5 to 30; the UI offers five presets (another value is shown as "Current answer time: n s").
- **Start quiz** sends `POST /api/start` ([Run a question](run-a-question.md)). It's disabled until a player has joined ("Start is available once a player has joined.").

## Rules & edge cases

- Defaults: **Test questions, 15 s**. Reset goes back to these defaults (Discrepancies 10).
- Settings can't be changed once the quiz has started ("Question set can only be changed in the lobby." / "Answer time can only be changed in the lobby."); the setup panel only shows in the lobby.
- The join address is `PUBLIC_URL` if set, else the request host; on localhost, the laptop's network address.

## Entry points

- `client/src/host/SetupPanel.jsx`, `JoinPanel.jsx`, `HostHeader.jsx`; step text in `client/src/host/hostSteps.js`

## Under the hood

- Server: `setQuestionSet`, `setAnswerTime`, `startQuiz`, `joinUrl`; limits `MIN_ANSWER_MS`, `MAX_ANSWER_MS`, `DEFAULT_ANSWER_MS` in `server.js`
- Tests: `tests/e2e/host.spec.js` ("lobby")
