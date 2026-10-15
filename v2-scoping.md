# V2 Scoping — Christmas Quiz

> **Superseded 2026-10-15** by `ux-forge/01_frame.md` (v2 = stability + Carbon UI; Christmas later). Kept for reference.

Status: **Planning only.** Nothing in the app has been changed. No UX Forge phase formally opened yet.

## Goal

Turn the existing XD Team Summer Gathering Quiz into a v2 for the work Christmas party — same working app, new visual theme, a couple of bug fixes, and a smoother feel.

## Decisions made so far

- **Reuse the existing app.** Keep `server.js` and the SSE-based architecture as-is. No rebuild, no new backend.
- **Scope is a reskin, not a full rebuild.** Full six-phase UX Forge is considered too heavy for this; leaning toward a lightweight design-brief step (Phase 5-style) instead of restarting at Phase 1.
- **Visual approach: minimalist first, Christmas second.**
  - Step 1: simplify the current pixel-arcade UI into a clean, minimalist base.
  - Step 2: layer Christmas touches on top of that clean base (not a full immersive Christmas theme from scratch).
- **No commissioned art / no new paid assets.** The pixel art for the summer arcade theme took real time and money — v2 should avoid that. Styling will be CSS/SVG only, plus free icon packs and free CSS effect snippets (e.g. CSS-only snowfall, fairy lights) if used.
- **Preserve the pixel arcade theme.** Before any v2 work starts, snapshot the current version so it's never at risk:
  - Tag/checkpoint the current commit (e.g. `v1-arcade-summer`).
  - Do v2 work on a new branch (e.g. `v2-christmas`).
  - User has confirmed a preference for the **git branch approach** over a literal folder copy.

## Open / undecided

1. **UI kit / component approach — not decided.**
   - Pico CSS was discussed as a candidate (classless, no build step, drop-in via `<link>`, themeable through CSS variables, low migration effort given the app already uses CSS custom properties).
   - Alternatives surfaced: Bulma (more prebuilt components, more "framework"-looking), Open Props (design tokens only, not components — more manual work).
   - **Pixelact UI** added as a candidate (2026-09-09) — user thinks it could be a nice fit:
     - Site: https://www.pixelactui.com/
     - Repo: https://github.com/pixelact-ui/pixelact-ui
     - Note: pixel-art-styled component library — worth checking against the "minimalist first, Christmas second" direction above, since it leans retro/arcade rather than clean/minimal. May fit better if the pixel-arcade look is partially kept, or could conflict with the minimalist-base decision. Needs evaluation (build step/framework requirements, license, component coverage) before committing.
   - User's rationale (2026-09-09): the current summer edition UI is fully custom-built (hand-rolled markup/CSS), whereas Pixelact UI is a proper component library with a real repo. Idea floated: adopt the library's components as the structural base, then reskin via colors/backgrounds/etc. on top — rather than hand-simplifying the existing custom UI. **Not decided yet** — still weighing this against the minimalist-first direction and against Pico CSS/Bulma/Open Props.
   - Reference project built with Pixelact UI: https://www.trygitgarden.com/ (2026-09-09)
   - User is not yet committed to Pico, Pixelact UI, or any specific kit.
2. **Christmas visual accent direction — not decided.** Options discussed: cozy/Nordic-hygge, classic red & green postcard, frosty elegant (navy/gold), playful cartoon. No pick made yet.
3. **Christmas question content — not started.** Current `questions/real.md` has 25 World Cup/USA-Canada-Mexico questions. Would need a themed replacement set (same format).
4. **Bug root causes — not yet investigated.** Noted but not looked into in code yet:
   - Selecting an avatar before/after typing a name overwrites or clears the typed name (participant setup screen).
   - One participant got stuck on a question during the live event and missed it (possibly an SSE reconnect or timer edge case).

## Not in scope (per current thinking)

- Full rebuild of app structure or backend.
- New commissioned/custom art assets.
- Restarting the full UX Forge six-phase process from Phase 1.

## Next possible steps (none started yet)

- Decide on UI kit approach (or hand-rolled minimalist CSS instead).
- Pick a Christmas visual accent direction.
- Investigate the two known bugs in `public/app.js` to scope fixes.
- Draft new Christmas question set.
- When ready: tag current state as `v1-arcade-summer`, branch to `v2-christmas`, then proceed to implementation (only with explicit approval).
