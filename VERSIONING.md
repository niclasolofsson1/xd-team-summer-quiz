# Versioning

This project uses version numbers in the form **MAJOR.MINOR.PATCH** — for example `v1.4.2`.

| Part | Changes when | Example |
|---|---|---|
| **MAJOR** (first number) | A big shift: a redesign of the whole product, a change in what it fundamentally does, or a declared release | `v1.4.2` → `v2.0.0` |
| **MINOR** (middle number) | An approved improvement: a new feature, a new behavior, a layout or visual design pass | `v1.4.2` → `v1.5.0` |
| **PATCH** (last number) | A small fix: a bug, a typo, a color or spacing tweak, a copy correction | `v1.4.2` → `v1.4.3` |

When a number goes up, every number to its right resets to zero.

## Where versions start

- **v1** — the arcade version played at the Summer Gathering (tag `v1-arcade-summer`).
- **v1.1.0–v1.5.0** — the v2 work for the Christmas party, one version per session (`ux-forge/02_design_spec.md`, section 9).
- **v2.0.0** — the party version, only after the real-phone rehearsal and the project owner's go-ahead. Never bumped automatically.
- MAJOR bumps after that also need the project owner's say-so.

## How the level is chosen

- The Orchestrator proposes the level (MAJOR, MINOR, or PATCH) as part of each iteration proposal, and the project owner approves it together with the change.
- If one commit contains several changes, the biggest one decides the level.
- When in doubt between MINOR and PATCH: if a user of the product would notice something new or different, it's MINOR.

## What happens on every version

Each approved change is released as one commit that contains:

1. The change itself.
2. A new entry at the top of `CHANGELOG.md`, describing in plain language what changed compared to the previous version.

That commit is tagged with the version (`git tag -a v0.3.0`), and the tag is pushed together with the commit. Every version can be found, compared, or rolled back to on GitHub.

## Writing changelog entries

- Write for a person, not a developer: what someone using or reviewing the product would notice.
- One line per change. Start fixes with "Fixed:".
- Add a one-line summary under the version heading.
- No file names, commit hashes, or code terms unless they matter to the reader.
