# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Internal back office: the Strapi v5 admin (this workspace, `apps/strapi`). All Tiween admin screens are local plugin admin UIs under `src/plugins/*/admin/src/`, mounted inside the stock Strapi admin shell. The public site has its own record in `apps/client/PRODUCT.md` and is out of scope here.

## Users

- **Venue managers** (Venue Manager RBAC role): maintain their own venues, properties and event programming. They see only what their scope allows; the server fails closed on anything outside it.
- **Cultural operators:** festivals, distributors and programmers who enter events and catalog works on behalf of the venues or programmes they run.
- **Tiween editors:** the internal team that curates the catalog of record, mainly the v1 short-film directory: works, people, credits, cast, videos, distinctions, links, posters, and their publication per language.
- Shared job: get accurate catalog and programming data into Tiween in French, Arabic and English, and publish it per language once it is complete. They are data-entry and curation users working at a desk, not the public audience.

## Product Purpose

The admin is the content supply side of Tiween. If the catalog is wrong, thin or untranslated, the public discovery site has nothing to show. Success for this surface (inferred from the v1 milestone, not yet owner-confirmed): an editor can create a complete, publishable short film (all required credits, media and translations) without help, and can see at a glance what is still missing before publishing in each language.

## Positioning

- A Tunisian, trilingual catalog editor built inside Strapi rather than a separate tool: one login, Strapi RBAC, and Strapi's own interaction language, extended only where the catalog model needs it (credits graph, locale tabs, publish rules).
- Content is entered per locale on equal footing. Arabic is a first-class content language, not a translation afterthought.

## Operating Context

- Desktop and laptop browsers at a desk, during long data-entry sessions. Not phone-first.
- Admin interface languages are `en`, `fr` and `ar` (`src/admin/app.tsx`). Content locales come from the i18n plugin; nothing hardcodes the locale list.
- Editors copy data in from festival sites, press kits and distributor sheets, or import them (the events-manager Import page, the `tmdb-integration` plugin), so paste-heavy forms and combobox lookups (people, characters, credit roles) are the common path.
- Publication is per locale: each language row is draft, modified or published on its own, and the short-film publish rules are evaluated on the saved default-language draft.

## Capabilities and Constraints

**Shipped plugin admin UIs:** `events-manager` (works catalog list and work form with locale tabs and a publish bar, planning calendar, import, dashboard), `venues` (venue and property CRUD, map picker, status badges), plus thinner shells for other plugins. `entity-properties` is a vestigial empty shell.

**Constraints:**

- **Plugin-first:** new admin code goes in a local plugin under `src/plugins/`, not `src/api/`. Exceptions need a recorded `plugin_waiver`.
- **Strapi Design System v2 only** (`@strapi/design-system` 2.x, `@strapi/icons`, `Layouts` from `@strapi/strapi/admin`). The admin never takes the Tiween B2C brand (no gold, aubergine, Lalezar, or category colors).
- Catalog of record is the unified `creative-work` (type `film | short-film | play`) with a person / character / credit-role graph. There are no `directors` or `trailer` fields; directors come from credits and trailers from videos. The legacy `movie` and `play` types are retired.
- Forms use react-hook-form + zod; server publish guards re-check every publish, so client-side rule lists are advisory.
- Every user-visible string goes through the plugin's translations (`admin/src/translations/{en,fr,ar}.json`) with an English default; errors surface as translated notifications, never raw server messages or stack traces.
- Admin routes are protected by plugin policies reading the CASL ability; the UI must handle a forbidden or empty scope honestly.
- Single-instance backend (no Redis, no replicas above 1).

**Out of scope for admin design:** ticketing operations (dormant, feature-flagged off), payments dashboards, public-facing marketing.

**Open product decisions (inferred, confirm with the owner):**

- Which roles may publish versus only save drafts.
- Whether venue managers see the catalog (works) screens in v1, or only Tiween editors do.

## Brand Commitments

- The admin carries Strapi's identity, not Tiween's. Tiween appears only by name in plugin titles and copy.
- **Voice:** clear, direct, sentence case, imperative ("Add a work", "Save", "Publish"). Errors are specific and actionable. No emoji.

## Evidence on Hand

- Real plugin screens: `src/plugins/events-manager/admin/src/` (Works list, WorkForm, LocaleTabs, PublishBar, editors for credits, cast, videos, distinctions, streaming links) and `src/plugins/venues/admin/src/` (PluginLayout, SideNav, StatusBadge, VenueFormModal, MapPicker).
- Design rules: `.claude/skills/strapi-design-system/` (SKILL.md, foundations.md, rules.md) at the repo root.
- `scripts/seeds/data/creative-works.json` (repo root): 10 seeded short films with no crew or cast.
- **Absent, do not fabricate:** usage numbers, editor counts, task-time benchmarks.

## Product Principles

1. **Stock Strapi first.** An editor who knows Strapi should feel at home on every plugin screen; custom UI is the exception and must justify itself.
2. **Show what blocks publishing.** Missing required data is listed in words, per language, before the editor tries to publish.
3. **Three content languages, one record.** French, Arabic and English rows of a work are edited side by side through locale tabs, and Arabic text is entered and displayed right-to-left.
4. **Honest states.** Loading, empty, forbidden and failed states are explicit and offer the next action; nothing fails silently.
5. **Scoped by role.** A venue manager only ever sees and edits their own scope.

## Accessibility & Inclusion

- WCAG 2.1 AA baseline, inheriting Strapi DS components' keyboard and screen-reader behavior.
- Every field has a visible label; hints and errors are attached through `Field.Root` / `Field.Hint` / `Field.Error`; icon-only buttons carry a label.
- Status is never shown by color alone: badges always carry a text label.
- Arabic content renders right-to-left with Western digits.
