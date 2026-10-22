# Strapi Design System — implementation rules

Verbatim from the Claude Design kit's `design_handoff_strapi_design_system/CLAUDE.md`
(paths in it refer to that kit, not this repo).

## Non-negotiables

- **Use the semantic token aliases, never raw ramps.** `--surface-card`, `--text-body`, `--border-default` — not `--color-neutral-0`, `--color-neutral-800`, `--color-neutral-200`. The ramps exist to define the aliases.
- **Never use `--text-disabled` (`#a5a5ba`) for readable text.** It is a disabled-state token and fails WCAG AA on every light surface in this system (~2:1). Low-emphasis body copy uses `--text-muted` (`#666687`).
- **One 4px radius** on buttons, inputs, cards, tables, badges. Pill radius only for avatars, status dots, toggle tracks. This is not a rounded UI.
- **Borders, not shadows,** are the separation device: 1px `--border-subtle` / `--border-default`. Shadows are restrained and cool-tinted; three levels only.
- **No custom webfont.** The native system stack is intentional. Do not add a font file, and do not "fix" `Oxygen` in the stack — it is a system font, not a missing webfont.
- **Weights are 400 / 500 / 600 only.** Body 14px, page titles 32px/600.
- **4px spacing grid**, no exceptions: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.
- **No emoji and no Unicode-character icons.** Use the Strapi icon set (`packages/icons/`), inlined as SVG or via CSS `mask` so `currentColor` applies — a plain `<img>` renders them black.
- **Logo rules are hard constraints.** Never separate the wordmark from the monogram; never recolour, redraw, retype, stretch, or rotate either; the monogram keeps its blue container always. Use the SVGs in `assets/` verbatim. On dark backgrounds only the wordmark inverts.

## Interaction states

Apply consistently — these are what make the system feel like Strapi:

- **Hover** — neutral controls darken one step; the primary button _lightens_ (`600 → 500`); cards gain an indigo border + popup shadow.
- **Press** — filled buttons darken one step (`600 → 700`). Light/secondary buttons keep a white fill but take the accent border + text colour. No scale-down.
- **Focus** — 2px `--color-primary-600` outline at 2px offset, keyboard only.
- **Motion** — 120 / 200 / 320ms, `cubic-bezier(.25,.46,.45,.94)`. No bounces. Respect `prefers-reduced-motion`.

## Copy voice

Sentence case everywhere; uppercase only for section overlines. Imperative and second person in UI ("Create new entry", "Save"). Use Strapi's exact terminology: _Collection type_, _Single type_, _Component_, _Dynamic zone_, _Entry_, _Draft & Publish_, _Content-Type Builder_. Errors are specific and actionable.

## Before you build components

If this app is Strapi UI, check whether `@strapi/design-system` (npm) can be installed instead of reimplementing the 31 components. Use this bundle as the design spec in that case. Reimplement only where the real package cannot be used.

Do not copy the `.jsx` patterns from the design bundle — they run under browser-side Babel on a global namespace, which is a prototyping shim, not an architecture.
