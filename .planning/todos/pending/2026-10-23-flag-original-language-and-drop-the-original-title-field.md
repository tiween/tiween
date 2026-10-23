---
created: 2026-10-23T11:19:20.579Z
title: Flag original language and drop the original title field
area: database
severity: major
files:
  - apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json
  - apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts:120
  - apps/strapi/src/plugins/creative-works/server/src/services/creative-work.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
  - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
  - apps/strapi/src/plugins/tmdb-integration/server/src/services/movie.ts
  - apps/strapi/scripts/seeds/data/short-films.json
---

## Problem

Owner directive (2026-10-23): "use native i18n for content translation: thus title (french) and original title does not make sense anymore, for each movie we should be able to flag the original language".

Today `creative-work` already localizes `title` and `synopsis` through Strapi's native i18n (`pluginOptions.i18n.localized: true`), but it ALSO carries a non-localized `originalTitle` string, and the admin form labels the title "Title (French)" with French as the implicit source (Phase 1 D-13: French is the source; EN/AR AI-drafted; AR title seeded from `originalTitle`). The result duplicates data (the Arabic title and `originalTitle` hold the same text for Tunisian films) and hard-codes French as the original when many works are originally Arabic or Tunisian Arabic.

The short-film editor mockup (https://claude.ai/artifact/2FienopuGhw26LX9ydV21h) currently shows "Title (French)" + "Original title"; it must change with this.

## Solution

Direction (to confirm in discuss-phase):

- Owner decision (2026-10-23): for short films the original language is ALWAYS one of the site locales (fr/ar/en). The form shows an "Original language" boolean toggle next to the title in each locale; turning it on in one locale moves the flag there (exactly one locale flagged). The flagged locale's tab gets an "Original" badge. No select list of ISO languages.
- Storage to decide in discuss-phase: a localized boolean (`isOriginal`) with a lifecycle/service enforcing "exactly one true across locales", or a single non-localized enum (`originalLocale: fr|ar|en`) that the per-locale toggle writes to (no cross-locale sync needed). The UI is the same either way.
- Remove `originalTitle` entirely (no fallback for non-site languages). Migrate existing values into the matching locale's `title` and flag that locale.
- The existing `language` JSON field (spoken languages, ISO codes like `aeb`) stays separate; it is not the original-language flag.
- Revisit D-13 (French as translation source) and D-20/AI-draft marking: the "source" for AI drafts becomes the original-language locale, not always French.
- Touch points: schema + migration of existing `originalTitle` values into the right locale title, short-films read API (`originalTitle` in the response shape, Phase 2 detail page shows original title), seed importer/curation data, TMDB integration (`original_title`/`original_language`), admin WorkForm + MovieCard + ContentSearchPanel, tests that reference `originalTitle`, Meilisearch index fields (Phase 3).
- Slug: currently "made from the French title"; decide which locale's title drives the slug.
