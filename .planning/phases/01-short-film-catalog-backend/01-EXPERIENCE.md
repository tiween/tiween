---
phase: 01-short-film-catalog-backend
mockup_status: not-applicable
mockup_waiver: "Gap-closure bug fixes to the existing Works admin form (edit-page load crash, silent Save with a hidden invalid streaming link, Arabic RTL). No new screen, flow or layout. Visual rules come from apps/strapi/DESIGN.md (Strapi DS v2)."
design_reference: apps/strapi/DESIGN.md
---

# Phase 1 — Experience (Works admin form, gap closure)

**Last updated:** 2026-11-08

## Flow (unchanged; now has to work end to end)

1. Events Manager → Works → Create. Fill the FR tab (type Short film), pick media, add credits and streaming links, then Save.
2. The redirect to `works/:documentId` **opens the saved film**, with genres, credits, people and media loaded. It must not crash.
3. Switch to the AR and EN tabs, translate the title and synopsis, then Save and Publish each language.
4. Edit a field and Save, then Unpublish each language.

## States

| State                            | Behavior                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading saved work               | Uses the existing page loader.                                                                                                                                              |
| Load error                       | The existing error state with a notification. No "Something went wrong" crash screen.                                                                                       |
| Save blocked by validation       | Save always gives feedback. Either the request is sent, or a visible translated error shows on the offending field, plus an error notification if that field is off-screen. |
| Hidden section after type switch | Short-film-only fields (streaming links, featured rank) are not validated, and not sent, when the type is not Short film. A blank hidden row never blocks Save.             |
| Arabic locale                    | Text controls render right-to-left.                                                                                                                                         |

## Copy (new strings, in FR / AR / EN translation files)

- Streaming URL error: "Enter a valid https:// link" (FR: « Saisissez un lien https:// valide », AR: «أدخل رابط https:// صالحًا»).
- Generic form error notification: reuse the existing form-error string if there is one. Otherwise: "Some fields need attention".
