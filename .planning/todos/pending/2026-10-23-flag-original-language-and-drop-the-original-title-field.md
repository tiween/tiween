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

- Add a per-work "original language" flag (non-localized). Each locale's `title` is then just "the title" in that locale; the locale whose language is the original is marked as such in the form (badge on the language tab, e.g. "Original").
- Remove `originalTitle`, or keep it ONLY for originals outside the site locales (fr/ar/en), e.g. a German or Italian short. Decide which.
- Clarify the relation with the existing `language` JSON field (spoken languages, ISO codes like `aeb`): Tunisian Arabic (`aeb`) is not a site locale, so the flag likely needs both an ISO original-language code and a mapping to the closest site locale (`aeb` → `ar`).
- Revisit D-13 (French as translation source) and D-20/AI-draft marking: the "source" for AI drafts becomes the original-language locale, not always French.
- Touch points: schema + migration of existing `originalTitle` values into the right locale title, short-films read API (`originalTitle` in the response shape, Phase 2 detail page shows original title), seed importer/curation data, TMDB integration (`original_title`/`original_language`), admin WorkForm + MovieCard + ContentSearchPanel, tests that reference `originalTitle`, Meilisearch index fields (Phase 3).
- Slug: currently "made from the French title"; decide which locale's title drives the slug.
