---
type: convention
title: Strapi v5 flat response shape
description: Why the v4 attributes wrapper must never be reintroduced
tags: [strapi, api]
verified: 2026-08-12
sources: [apps/client/src/lib/strapi-api/, apps/strapi/src/plugins/]
---

Strapi v5 returns `{ data, meta }` with fields flat on each entry: `response.data.title`.
The v4 `data.attributes.title` wrapper does not exist. Every call site under
`apps/client/src/lib/strapi-api/` reads the flat shape, and no `.attributes` access
survives anywhere in `src/lib/strapi-api` or `src/features`.

Do not add a transform layer that remaps responses into the v4 shape. Model training
data is dense with v4 examples, which makes this the single most repeated mistake in
this codebase.

Documents are addressed by `documentId`, not `id`. Persistence goes through the
Document Service (`strapi.documents(uid)`); the Entity Service has zero remaining
call sites and must not return.
