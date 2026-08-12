---
type: landmine
title: entity-properties is an empty registered shell
description: A plugin that loads but defines nothing, pending deletion in story 2C.5
tags: [strapi, plugins]
verified: 2026-08-12
sources: [apps/strapi/config/plugins.ts, apps/strapi/src/plugins/entity-properties/]

---

`apps/strapi/config/plugins.ts` enables `entity-properties`, so Strapi loads it, but
every one of its index files is an empty export and it defines no content types.

Its `property-category` and `property-definition` types now live in
`apps/strapi/src/plugins/venues/server/src/content-types/`. Only the plugin's own
admin placeholder pages still reference it. Deletion is story 2C.5, the open
consolidation sweep.

Never add content types, services, or routes here. The similarly-named component
namespace `apps/strapi/src/components/entity-properties/` is unrelated and live.
