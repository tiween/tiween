# Phase 1 — Design (Short-Film Catalog Backend)

**Last updated:** 2026-11-08

This phase was planned before the design-docs rule (2026-10-22). This file was
added for the gap-closure plans (01-15+). It covers only the existing
**Events Manager → Works** admin form and adds no new screen.

## Design system

- Surface: Strapi admin, plugin `events-manager` (`apps/strapi/src/plugins/events-manager/admin/src/`).
- System: Strapi Design System v2. The canonical spec is **`apps/strapi/DESIGN.md`**,
  with its sidecar at `apps/strapi/.impeccable/design.json`. Rules are in
  `.claude/skills/strapi-design-system/`.
- No Tiween DS tokens, no hex colors, no native HTML controls, no styled-components overrides.

## Components touched

| Component                                  | Change                                                                                                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkForm` (edit page `works/:documentId`) | Loads a saved work with its relations resolved, so the page renders and doesn't crash. No layout change.                                                                                                         |
| `StreamingLinksEditor` URL input           | Wrapped in `Field.Root` and shows a translated `Field.Error` (FR/AR/EN) for an invalid or blank https URL. This follows "Inputs / Fields" in `apps/strapi/DESIGN.md`.                                            |
| Locale tabs and content inputs             | When the active content locale is `ar`, text inputs, textareas and previews carry `dir="rtl"`. Mixed content uses `dir="auto"`. This follows the Arabic (RTL) rule in `apps/strapi/DESIGN.md` § Inputs / Fields. |

## Layout, tokens, responsive

Unchanged. The page keeps the existing `Layouts.Root` / `Layouts.Header` / `Layouts.Content` shell and the publish bar.
