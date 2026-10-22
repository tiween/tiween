---
name: strapi-design-system
description: Visual and copy rules for Strapi admin UI in Tiween's local plugins (apps/strapi/src/plugins/*/admin). Use when writing DESIGN.md/EXPERIENCE.md, making Claude Design mockups, or building/reviewing plugin admin screens. Not for the public site (apps/client uses the Tiween DS).
---

# Strapi Design System (admin plugins)

Source: the owner's Claude Design project "Strapi Design System" (a recreation of
`strapi/design-system`, light theme). Copied here so GSD agents read the same rules the
mockups are built from.

## Scope

| Surface                              | Use                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/strapi/src/plugins/*/admin/**` | This skill + the `strapi-ui-design` plugin skill                                                                          |
| `apps/client/**` (public site)       | **Not this.** Tiween DS: `_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md` |

## Mockups vs production

- **Mockups (Claude Design):** attach the "Strapi Design System" design system
  (https://claude.ai/artifact/DGS9jjvAL6zT3NKEfNBQgc, migrated 2026-10-22 from standalone
  Claude Design, which closes 2026-12-14). Its bundle also carries the admin UI kit screens
  (`App`, `ListView`, `EditView`, `MediaView`) as a starting point.
- **Production code:** import components from `@strapi/design-system` (v2) and icons from
  `@strapi/icons`. The Claude Design kit is the _visual spec_; its component props are a
  prototyping shim and differ from v2 (for example v2 text inputs compose `Field.Root` /
  `Field.Label` / `Field.Input`). Follow the v2 API, not the kit's.

## Files

- `rules.md`: implementation non-negotiables, interaction states, copy voice (verbatim from the kit's handoff).
- `foundations.md`: color, type, spacing, radius, shadows, motion, iconography, content voice.

## Non-negotiables (summary)

- Neutral cool-gray UI + a single indigo `#4945ff` accent. Flat fills, no gradients.
- 4px radius on everything (pill only for avatars, status dots, toggle tracks).
- 1px hairline borders separate; shadows are soft and restrained (three levels).
- System font stack; weights 400/500/600 only; body 14px, titles 32px.
- 4px spacing grid. Sentence case; UPPERCASE only for section overlines. No emoji.
- Strapi's solid-fill icon set only. One primary (`default`) button per view group.
