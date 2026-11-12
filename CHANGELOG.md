# Changelog

All notable changes, newest first. Version rules: [VERSIONING.md](VERSIONING.md).

## v1.3.1 — Host redesign

- The host page has a new, calmer layout built on Carbon's own guidance: a large main area on the left and one control column on the right, both filling the screen.
- In the lobby the join address comes first, in large type, with a **Copy link** button. Players appear underneath as big avatars as they join; before anyone joins it says "Waiting for the first player" and what to do.
- Question set and answer time are now simple dropdowns. The test-questions warning is a quiet note instead of a loud yellow box.
- There's one big button for the next step, across the full width of the control column, with its text centred and an arrow. When it can't be pressed yet, a line above it says why ("Start unlocks when the first player joins.").
- During a question the question itself takes centre stage in large type, with bigger answer tiles and the timer below; the control column shows the next step and the players list with a check for everyone who has answered.
- The header is simpler: just the title, the connection status and the ⋮ menu (with Reset).
- The page now works from phone width up, without scrolling sideways.

## v1.3.0 — Carbon host app

- The host page (`/host.html`) is new, in the same clean Carbon style as the player app (light grey theme, made for a laptop).
- One large button always does the next step: Start quiz → Reveal answer → Show leaderboard → Next question → and at the end the three steps of the final reveal.
- A presentation clicker works: →, PageDown or Space press that button. A quick double press only counts once, and nothing happens while you're typing or the Reset window is open.
- During a question you see the question, its category, the timer and how many have answered. After the reveal: the right answer, how many got it right, missed it, and played.
- The players list on the right shows everyone's avatar, name, score, a green dot when they're online and a check when they've answered, plus a line like "18 of 20 answered · 2 offline".
- In the lobby you pick the question set and answer time, copy the join link and open the big screen. A warning shows while the test questions are selected.
- During the final reveal you get a private preview of the next podium step, only on your screen.
- Reset moved into the menu (⋮) in the header and asks you to confirm in a red dialog.
- The header shows the phase, the question set and whether the host is connected; if the connection drops, the page reconnects on its own.
- The big screen is still the arcade version until v1.4.0. The old arcade host page is removed (it's kept in the `v1-arcade-summer` tag).

## v1.2.8 — Calmer "you" on the podium

- If you make the podium, your place now shows a small grey "You" tag under your name instead of a blue frame around it.

## v1.2.7 — Smooth timer bar

- The blue timer bar on the question now drains smoothly instead of in small jumps. After a refresh mid-question it carries on from the right point.

## v1.2.6 — Your pick in Carbon blue

- Your answer is now marked with a solid blue frame (Carbon's "selected" style) everywhere: on the question, on Time's up and on the reveal. The dashed frame is gone.
- On the reveal your pick is marked "Your answer" also when it was right, not only when it was wrong.

## v1.2.5 — No zoom when typing your name

- Fixed: on iPhones, tapping the name field zoomed the page in and it stayed zoomed. The field's text is now 16 px, the size Safari doesn't zoom for. Pinch-zoom still works for anyone who needs it.

## v1.2.4 — No blue boxes after a tap

- Fixed: tapping an avatar left a blue focus box around it. The blue focus ring now only appears when someone moves through the page with a keyboard. The name field still shows its line while you type.

## v1.2.3 — Calmer reveal and podium

- The reveal no longer draws a green frame around the correct answer. The correct answer is now the only fully coloured tile, marked "Correct answer".
- If you picked wrong, your answer is shown tinted like the others, with a dashed outline and "Your answer", so the right answer stands out.
- The confetti at the end is gone. Instead, the podium shows gold, silver and bronze medals 🥇 🥈 🥉.

## v1.2.2 — Tidier answer tiles

- The answer text now sits in the middle of its tile, level with the letter, instead of near the top.
- On the reveal, the answers that aren't right (or yours) are shown in a light tint of their colour with dark text, instead of faded out. They're now easy to read.
- The name field on the Join screen is a bit taller (48 px), easier to tap.

## v1.2.1 — Phone-sized buttons and fields

- Fixed: on the player app the Join button, the name field and other Carbon buttons were only as tall as their text. They're back to Carbon's normal 48 px height, easy to tap on a phone.
- A browser test now checks that buttons and answer tiles stay phone-sized.

## v1.2.0 — Carbon player app

A new player app for phones, built with IBM's Carbon design system. The host and big screen stay arcade for now.

- Joining is one screen: type your name, pick one of 12 emoji avatars, tap Join. Your last name is remembered.
- Fixed: a half-typed name no longer disappears when someone else joins.
- Fixed: a phone that silently lost its connection stayed stuck on an old screen. Phones now notice when the connection goes quiet, reconnect on their own, and check again when you come back to the browser.
- Players now see a banner while the connection is down: "Reconnecting…", then "Connection lost." with a Retry button.
- Fixed: an answer that never reached the server looked sent. Now an answer shows "Answer locked" only once the server has it. Failed sends are retried automatically, then you're asked to tap again.
- Fixed: tapping a second answer could change what you saw while your first answer counted. The answer you see is always the one that counts.
- Refreshing the page keeps you in the game; after a reset you're asked to join again.
- The reveal shows "Correct! +850", "Not this time" or "No answer", the right answer, your answer and how many picked each.
- The leaderboard shows your rank and score, the top 10, and your own row if you're further down. Shared places show as "=5th".
- The final podium reveals in the same three steps, with confetti for the champion (none if you've turned off animations).
- The arcade host and big screen show the new emoji avatars.
- New for developers: `npm run build` (needed before `npm start`), `npm run dev`, unit tests, and browser tests of the player flow (`npm run test:e2e`). Render's build command becomes `npm install && npm run build`.

## v1.1.0 — Server hardening

A fairer, sturdier server under the same arcade screens, tested with 25 simulated players.

- Only your own phone can answer for you: joining now hands the phone a secret key that answers must carry.
- Scores now change only when the host reveals the answer, so nobody can work out the right answer early.
- The answer timer now ends as soon as everyone has answered; the host still triggers the reveal.
- Players with equal scores are now separated by who answered correctly faster; if that's also equal, they share the place.
- If a phone dies or a browser is closed, the player can rejoin from another device by entering the same name, score included. A name still in use by a connected player can't be taken.
- The server now knows which players are connected (used by the new host screen later).
- Fixed: a player who didn't answer saw "Incorrect"; it now says "No answer".
- Fixed: answers outside A–D and oversized requests are now refused.
- Fixed: fonts were sent with the wrong file type.
- The server now prints a warning at startup if no host PIN is set, and checks the PIN more safely.
- The server can now tell screens the right join address for wherever it runs (the new big screen will use it; the arcade one keeps its fixed QR code).
- The live connection sends its keep-alive signal more often and tells proxies not to hold messages back.
