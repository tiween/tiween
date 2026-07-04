# Claude Design export — Strapi DS · Venues Plugin Admin

**Source project:** `claude.ai/design/p/1054bff7-5f5f-4489-97e3-54129a48639d`
("Strapi DS — Venues Plugin Admin", owned by Ayoub).
**Exported:** 2026-06-19 via the `DesignSync` MCP (claude.ai design scopes).

## What this is

A faithful, **cosmetic** recreation of the Strapi DS v2 Venues plugin admin, built
_from_ the `ux-tiween-bmad-version-2026-06-18` spines. Its own README states: "flows
are faked, validation is shallow, the map is a styled placeholder — demonstrates
component coverage, not production logic." It uses a custom `_ds_bundle.js` global
(`window.StrapiDSVenuesPluginAdmin_1054bf`), **not** real `@strapi/design-system`
imports. Treat it as the **authoritative visual + behavioral reference** for the
2D implementation stories, not as drop-in code.

## Files exported locally (S1-relevant subset)

- `ui_kit/App.jsx` — the full interactive UI kit: S0 shell, S1 list (search/filter/
  sort/bulk/empty), S1 venue form (sectioned + map picker), S2 authoring, S3
  property-value editor. The single best behavioral reference.
- `ui_kit/data.js` — seed data: TYPES, CITIES, VENUES, CATEGORIES, DEFINITIONS +
  `slugify`/`labelFor` helpers.

## Full file inventory in the source project (not all exported)

```
tokens/{colors,typography,spacing,semantics}.css   — DS theme tokens (CSS vars)
guidelines/*.card.html                             — color/type/spacing specimens
components/actions/{Button,IconButton}             — .jsx + .d.ts + .prompt.md
components/forms/{Field,TextInput,NumberInput,Textarea,SingleSelect,Toggle,Checkbox}
components/feedback/{Badge,StatusBadge,Loader,EmptyStateLayout}
components/data/{Table + Thead/Tbody/Tr/Th/Td}
components/overlays/{Modal,Dialog}
components/navigation/{SideNav,Tabs,Accordion}
templates/venues-admin/VenuesAdmin.dc.html         — copy-ready shell + table
ui_kits/venues-admin/{App.jsx,data.js,index.html}
assets/icons/*.svg (@strapi/icons), assets/illustrations/*, assets/logo/Strapi.svg
README.md, SKILL.md
```

Re-fetch any file on demand: `DesignSync get_file --projectId 1054bff7-…  --path <path>`.

## ⚠️ Reconciliation points for implementation

1. **Type enum mismatch.** The kit's `data.js` TYPES use
   `cinema/theatre/musee/centre/salle`; story 2D.1 schema uses
   `cinema/theater/cultural-center/museum/other`. The **schema enum wins** — map the
   UI labels onto the real enum values.
2. **The map picker** is a styled placeholder (no provider). 2D's open question OQ-1
   (Nominatim/OSM vs Google) still applies at implementation time.
3. **Custom DS bundle ≠ real DS.** Every `window.StrapiDSVenuesPluginAdmin_1054bf`
   component must be replaced by the real `@strapi/design-system` v2 import per the
   `handoff/ds-component-binding.md` cheatsheet and the `strapi-ui-design` v1.2.0
   `component-catalog.md`.
