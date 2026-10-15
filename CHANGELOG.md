# Changelog

All notable changes, newest first. Version rules: [VERSIONING.md](VERSIONING.md).

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
