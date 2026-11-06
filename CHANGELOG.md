# Changelog

All notable changes, newest first. Version rules: [VERSIONING.md](VERSIONING.md).

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
