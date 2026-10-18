# Phase 1: Short-Film Catalog Backend - Pattern Map

**Mapped:** 2026-10-18
**Files analyzed:** 27 new/modified
**Analogs found:** 25 / 27 (all analog paths verified git-tracked source under `apps/strapi/`)

All paths below are relative to `apps/strapi/` unless stated. `P` = `src/plugins/creative-works/server/src`, `A` = `src/plugins/events-manager/admin/src`.

## File Classification

| New/Modified File                                                                                        | Role               | Data Flow               | Closest Analog                                                                            | Match      |
| -------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `src/components/creative-works/streaming-link.json`                                                      | config (component) | CRUD                    | sibling `src/components/creative-works/distinction.json` (not excerpted; copy its shape)  | exact      |
| `P/content-types/creative-work/schema.json` (+country, language, streamingLinks, featured, featuredRank) | model              | CRUD                    | same file (`links` attr ~line 194, explicit `pluginOptions.i18n.localized`)               | exact      |
| `src/shared/short-film-rules.ts` (pure evaluator, ISO + language consts)                                 | utility            | transform               | `src/shared/validation.ts` (pure shared kit), imported by venues admin `validate.ts`      | role-match |
| `P/validation/short-films.ts`                                                                            | utility (Zod)      | request-response        | `src/plugins/events-manager/server/src/controllers/events.ts:20-100` (schemas)            | role-match |
| `P/services/short-films.ts`                                                                              | service            | request-response (read) | `src/plugins/events-manager/server/src/services/events.ts:329-352`                        | exact      |
| `P/controllers/short-film.ts`                                                                            | controller         | request-response        | `src/plugins/venues/server/src/controllers/venue-admin.ts:15-75` (+ events.ts controller) | exact      |
| `P/controllers/index.ts`, `P/services/index.ts`                                                          | config (registry)  | -                       | same files                                                                                | exact      |
| `P/routes/content-api.ts` (remove 3, add 4)                                                              | route              | request-response        | `src/plugins/events-manager/server/src/routes/index.ts:1-44`                              | exact      |
| `P/middlewares/index.ts` (rate limit)                                                                    | middleware         | request-response        | `src/plugins/events-manager/server/src/middlewares/index.ts`                              | exact      |
| `P/register.ts` (`documents.use` publish guard)                                                          | middleware         | event-driven            | `P/register.ts` stub; no `documents.use` precedent in repo                                | none       |
| `P/services/public-api.ts` (+4 facade methods)                                                           | service (facade)   | request-response        | same file lines 15-44                                                                     | exact      |
| `P/controllers/creative-work.ts` + `P/services/creative-work.ts` (remove findFeatured/findByType/search) | controller/service | request-response        | same files                                                                                | exact      |
| `src/plugins/events-manager/server/src/validation/venue-events.ts:40` (drop `short-film`, D-21)          | utility            | request-response        | same file                                                                                 | exact      |
| `src/bootstrap/i18n-locales.ts` (+`en`)                                                                  | config             | batch                   | same file                                                                                 | exact      |
| `A/pages/App.tsx`, `A/components/SideNav/index.tsx`, `A/translations/{en,fr,ar}.json`                    | route/component    | request-response        | same files                                                                                | exact      |
| `A/components/WorkForm/StreamingLinksEditor.tsx`                                                         | component          | CRUD                    | `A/components/WorkForm/VideosEditor.tsx`                                                  | exact      |
| `A/components/WorkForm/CountryLanguageFields.tsx`                                                        | component          | CRUD                    | `A/components/WorkForm/TheatreDetailsFields.tsx` + `CreditRoleSelect.tsx`                 | role-match |
| `A/components/WorkForm/index.tsx` (conditional sections, locale tabs, publish bar)                       | component          | CRUD                    | same file, `isPlay` at lines 109, 420-426                                                 | exact      |
| `A/components/WorkForm/schema.ts` (+fields, API mapping)                                                 | utility            | transform               | same file (`videos` at 189, 231, 279, 370, 454)                                           | exact      |
| `A/components/MediaInput/index.tsx` (media-library dialog)                                               | component          | file-I/O                | Strapi `Wysiwyg/Field.js` (node_modules, see RESEARCH Pitfall 2)                          | partial    |
| `scripts/seeds/shorts.ts` (`yarn seed:shorts`)                                                           | script             | batch                   | `scripts/seeds/index.ts:311-368, 740-760`                                                 | role-match |
| `scripts/seeds/utils/short-film-import.ts` (+ unit test)                                                 | utility            | transform               | `scripts/seeds/utils/creative-work-relations.ts` (+ `.unit.test.ts`)                      | exact      |
| `scripts/seeds/utils/media-upload.ts`                                                                    | utility            | file-I/O                | none in repo (use RESEARCH upload shape)                                                  | none       |
| `scripts/seeds/data/short-films.json`                                                                    | config (data)      | batch                   | `scripts/seeds/data/creative-works.json`                                                  | exact      |
| `P/__tests__/short-films.service.test.ts`                                                                | test (boot)        | request-response        | `src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts`                | exact      |
| `tests/fixtures/short-films.ts`, `tests/fixtures/index.ts`                                               | test fixture       | -                       | `tests/fixtures/events.ts`                                                                | role-match |
| `P/services/__tests__/short-films.unit.test.ts`                                                          | test (unit)        | -                       | `P/services/__tests__/public-api.unit.test.ts`                                            | exact      |

## Pattern Assignments

### `P/routes/content-api.ts` (route, request-response)

**Analog:** `src/plugins/events-manager/server/src/routes/index.ts` lines 5-44.

Public route shape, specific-before-param ordering, and a rate-limit middleware reference:

```typescript
{ method: "GET", path: "/events", handler: "events.findEvents",
  config: { policies: [], auth: false } },
// Register BEFORE `/events/:documentId` so `trending` is not captured
{ method: "GET", path: "/events/trending", handler: "events.findTrending",
  config: { policies: [], auth: false,
    middlewares: [{ name: "plugin::events-manager.trending-rate-limit",
                    config: { max: 100, windowMs: 60000 } }] } },
{ method: "GET", path: "/events/:documentId", handler: "events.findEvent",
  config: { policies: [], auth: false } },
```

Apply: order `/creative-works/short-films`, `/short-films/featured`, `/short-films/:slug/related`, `/short-films/:slug`. Handler form `short-film.<method>`. NEVER write `auth: true` (boot fails, see comment in that file lines 61-68). Current file (37 lines) has the 3 routes to delete (lines 4-27); keep `/persons/search` (28-35). Existing routes there lack `auth: false`; new ones need it. Real URL is `/api/creative-works/creative-works/short-films...` (RESEARCH Pitfall 12), the route `path` itself is `/short-films` relative to the plugin, verify against how `/creative-works/featured` was mounted before choosing the path string.

### `P/validation/short-films.ts` (Zod, request-response)

**Analog:** `src/plugins/events-manager/server/src/controllers/events.ts` lines 52-100 (sort allowlist enum, `z.coerce.number().int().positive().max(...)`, `locale: z.string().min(2).max(10).optional()`).

Difference to apply deliberately: D-06 wants `.strict()` and a coded 400 (events uses non-strict + `ctx.badRequest("INVALID_QUERY")`). Use `validate()` from the shared kit (below); the full schema is in RESEARCH "Strict query schema".

### `P/controllers/short-film.ts` (controller, request-response)

**Analog:** `src/plugins/venues/server/src/controllers/venue-admin.ts` (STATUS_BY_CODE + respondError, lines 15-75) combined with the events controller factory shape.

**Imports** (venue-admin.ts:1-13):

```typescript
import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation" // from P/controllers/: same depth as venues, verify path

const PLUGIN_ID = "creative-works"
```

**Error envelope** (venue-admin.ts:23-75), copy wholesale, rename:

```typescript
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  INVALID_QUERY: 400,
  SHORT_FILM_NOT_FOUND: 404,
}
function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  if (!mappedStatus)
    strapi.log.error(
      `[...] unmapped error (code=${code ?? "none"}): ${err?.stack ?? err}`
    )
  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "ShortFilmError",
      message: "...",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(err?.details?.issues)
          ? { issues: err.details.issues }
          : {}),
      },
    },
  }
}
```

**Handler factory shape** (events.ts:31-47, 70-88): `const x = ({ strapi }: { strapi: Core.Strapi }) => ({ async method(ctx: any) {...} })`; delegate with `strapi.plugin(PLUGIN_ID).service("short-films").list(parsed)`; detail miss returns `ctx.notFound("...")` / coded 404; set `ctx.body = { data, meta }`.

Register in `P/controllers/index.ts` (add `"short-film": shortFilm`) and `P/services/index.ts` (add `"short-films": shortFilms`). Delete the 3 handlers in `P/controllers/creative-work.ts` (all of its current body: findFeatured, findByType, search) after the D-09 caller audit.

### `P/services/short-films.ts` (service, request-response read)

**Analog:** `src/plugins/events-manager/server/src/services/events.ts` lines 329-352:

```typescript
const [data, total] = await Promise.all([
  strapi.documents(EVENT_UID).findMany({
    status: "published",
    locale,
    filters,
    sort: sort ?? "startDateTime:asc",
    populate: EVENT_POPULATE,
    start: (page - 1) * pageSize,
    limit: pageSize,
  } as never),
  strapi
    .documents(EVENT_UID)
    .count({ status: "published", locale, filters } as never),
])
// meta: { pagination: { page, pageSize, pageCount, total } }
```

Adaptations (RESEARCH Patterns 3, 5, 6): force `filters.type = "short-film"` and `status: "published"`; query the default locale from `strapi.plugin("i18n").service("locales").getDefaultLocale()`, then overlay `title/synopsis/poster` from the requested locale; add `id:desc` tiebreaker; featured sorted in JS (rank asc nulls last, then publishedAt desc); numeric coercion in the projection (cf. `src/plugins/events-manager/server/src/utils/sanitize-public.ts` for pg decimal-as-string handling and the allowlist-projection style). Locale enumeration precedent: `listLocaleCodes` in `P/services/creative-work.ts`.

### `P/middlewares/index.ts` (middleware)

**Analog:** `src/plugins/events-manager/server/src/middlewares/index.ts:15-21` (currently `export default {}` here):

```typescript
import { createRateLimit } from "../../../../../shared/rate-limit" // confirm: events imports local ./rate-limit; shared one is src/shared/rate-limit.ts

export default {
  "short-films-rate-limit": (config: any, { strapi: _strapi }: any) =>
    createRateLimit({
      max: config?.max ?? 100,
      windowMs: config?.windowMs ?? 60_000,
    }),
}
```

Reference from route as `plugin::creative-works.short-films-rate-limit`. Keep the cap generous (RESEARCH Pitfall 10).

### `P/services/public-api.ts` (facade)

**Analog:** same file lines 15-44; add methods in the same delegating style:

```typescript
async findShortFilm(slug: string, locale?: string) {
  return strapi.plugin(PLUGIN_ID).service("short-films").findBySlug(slug, locale)
},
```

Extend `P/services/__tests__/public-api.unit.test.ts` with the `buildStrapi(internal)` mock helper (lines 12-17) for delegation tests.

### `P/register.ts` (Document Service publish guard)

**Analog:** none for `strapi.documents.use` (grep found no usage). Current stub:

```typescript
export default ({ strapi: _strapi }: { strapi: Core.Strapi }) => {
  /* Plugin registration logic */
}
```

Use RESEARCH Pattern 4 verbatim (guard `uid`, inspect `publish` and `create/update` with `params.status === "published"`, throw `new errors.ValidationError("...", { code: "SHORT_FILM_PUBLISH_BLOCKED", issues })` using `errors` from `@strapi/utils` exactly as `src/shared/validation.ts:13-17,41-44` does). Venues' `register.ts` (lines ~55-72) shows non-fatal registration style with `strapi.log` for the plugin-register phase. Pure rule evaluator lives in `src/shared/short-film-rules.ts`. Importer bypass (D-20) is an in-process flag only reachable from `scripts/seeds`.

### `src/plugins/events-manager/server/src/validation/venue-events.ts` (D-21)

Line 40: `export const CREATIVE_WORK_TYPES = ["film", "play", "short-film"] as const` used by `z.enum(CREATIVE_WORK_TYPES, ...)` at line 154. Change to `["film","play"]`; also update the client-side mirror (grep `CREATIVE_WORK_TYPES` in admin/venue-manager schema) and unit tests.

### `src/bootstrap/i18n-locales.ts`

Line 10: `const REQUIRED_LOCALES = [DEFAULT_LOCALE, { code: "ar", name: "Arabic (ar)" }]` becomes `[..., { code: "ar", ... }, { code: "en", name: "English (en)" }]`. Loop is idempotent (`findByCode` then `create`).

### `A/components/WorkForm/StreamingLinksEditor.tsx` (component, CRUD)

**Analog:** `A/components/WorkForm/VideosEditor.tsx` (full file read, ~120 lines).

**Imports** (lines 11-31): `Box, Button, Field, Flex, Grid, IconButton, SingleSelect, SingleSelectOption, TextInput` from `@strapi/design-system`; `Plus, Trash` from `@strapi/icons`; `Controller, useFieldArray` from `react-hook-form`; `humanize, useCatalogT` from `../Catalog/i18n`; option constants from `../Catalog/options` (add `STREAMING_PLATFORMS`, `ACCESS_TYPES` next to `VIDEO_TYPES`); `EMPTY_VIDEO` from `./schema` (add `EMPTY_STREAMING_LINK`).

**Core pattern** (lines 36-110):

```tsx
const t = useCatalogT()
const { fields, append, remove } = useFieldArray({ control, name: "videos" })
// per row: Grid.Root gap=2; Controller name={`videos.${index}.url`} -> TextInput with hasError
// Controller name={`videos.${index}.videoType`} -> SingleSelect + SingleSelectOption map
// IconButton label=t("videos.remove", ...) onClick={() => remove(index)} ; <Trash/>
// <Button variant="secondary" startIcon={<Plus/>} onClick={() => append({ ...EMPTY_VIDEO })}>
```

Always `t(key, fallback)` with a default string; always `disabled` prop pass-through; DS only.

### `A/components/WorkForm/index.tsx` (conditional sections)

**Analog (same file):** lines 109-110 `const isPlay = workType === "play"` and 420-426:

```tsx
{
  isPlay && (
    <FormSection
      title={t("workForm.theatreSection", "Theatre details")}
      hint={t("workForm.theatreHint", "...")}
    >
      <TheatreDetailsFields control={control} />
    </FormSection>
  )
}
```

Add `const isShort = workType === "short-film"` and mirror this for `StreamingLinksEditor` + featured/featuredRank; `CountryLanguageFields` unconditional (D-17). Form state is `useForm<WorkFormValues>({ resolver: zodResolver(workFormSchema), defaultValues })` (lines 100-106).

### `A/components/WorkForm/schema.ts`

Extend, following how `videos` is handled at: Zod `videos: z.array(videoFormSchema)` (189), `EMPTY_VIDEO` (231), default `videos: []` (279), API-to-form map `(work.videos ?? []).map(...)` (370), form-to-API `values.videos.map(...)` (454). Mirror each for `streamingLinks`; add `country`/`language` arrays and `featured`/`featuredRank`. Components are re-sent wholesale (note in file). `workToApiPayload` uses `orNull()`.

### `A/pages/App.tsx` and `SideNav`

**App.tsx** lines 14-32: add `<Route path="works" element={<WorksListPage />} />`, `works/new`, `works/:documentId` (WorkFormPage) inside the `PluginLayout` route, before the catch-all. **SideNav** lines 21-25: append `{ to: "works", labelKey: "events-manager.sidenav.works" }` and add the key to `translations/{en,fr,ar}.json`.

### `scripts/seeds/shorts.ts` (script, batch)

**Analog:** `scripts/seeds/index.ts`.
Boot (lines 751-754):

```typescript
strapi = await createStrapi({
  appDir: process.cwd(),
  distDir: process.cwd() + "/.build",
}).load()
```

Upsert-by-slug (lines 326-343, which SKIPS existing; the new importer must update instead):

```typescript
const existing = await strapi
  .documents(uid)
  .findMany({ filters: { slug: work.slug }, limit: 1 })
if (existing.length > 0) {
  idMaps.creativeWorks[work.slug] = existing[0].documentId
  skipped++
  continue
}
const doc = await strapi.documents(uid).create({ data, status: "published" })
```

Find-or-create reference data: `seedGenres` (154), `seedCreditRoles` (233, slug `director`), `seedPersons` (271), all with `status: "published"`. Per-work `warn` closure (line 321-322). Add `"seed:shorts": "tsx scripts/seeds/shorts.ts"` next to package.json line 25. Must call `ensureI18nLocales` itself, fail closed when upload provider is not ImageKit, and NOT touch `clear.ts` (it deletes all creative-works).

### `scripts/seeds/utils/short-film-import.ts` (+ unit test)

**Analog:** `scripts/seeds/utils/creative-work-relations.ts` (pure helpers; `CreditEntry`, `CastEntry`, `VideoEntry` interfaces; `CreativeWorkSeed`; `buildCreativeWorkData(work, {genres, persons, directorRoleId}, warn)`) and `creative-work-relations.unit.test.ts`, which asserts the payload's key set against the real `schema.json` (DW-13 guard). Copy that test technique so new keys (`country`, `language`, `streamingLinks`, `featured`, `featuredRank`) are checked against schema.json. Types in `utils/types.ts` (`IdMap`).

### `P/__tests__/short-films.service.test.ts` (boot suite, SDATA-05)

**Analog:** `src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts` lines 33-61:

```typescript
import request from "supertest"
import { createAdminSession } from "../../../../../../tests/helpers/admin"
import { cleanupStrapi, setupStrapi } from "../../../../../../tests/helpers/strapi"
jest.setTimeout(120000)
const api = () => request((strapi as any).server.httpServer)
const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
beforeAll(async () => { strapi = await setupStrapi() ... })
afterAll(async () => { await cleanupStrapi() })
```

Name `*.service.test.ts` (opt-in `yarn test:integration`). Public reads need no admin token; seed fixtures through `strapi.documents(uid).create/publish`. Assert coded errors via `res.body.error.details.code`. Use lowercase ASCII titles and no nulls in sort fixtures (RESEARCH Pattern 5). Run `yarn build:test-dist` first. Fixtures: follow `tests/fixtures/events.ts` and re-export from `tests/fixtures/index.ts`; remove/retype the 5 fake dev shorts there.

## Shared Patterns

### Coded validation errors

**Source:** `src/shared/validation.ts:20-48` (`validate(schema, data)` throws `ValidationError` with `details.code = "VALIDATION_FAILED"` plus `issues[{path,message}]`).
**Apply to:** short-film controller, publish guard (reuse `errors.ValidationError` with `details.code`), importer.

### Public-route conventions

**Source:** events-manager `routes/index.ts` (`auth: false`, `policies: []`), `services/events.ts:329-352` (always `status: "published"`, `start/limit`, `meta.pagination`). Document Service defaults to draft reads, so `status: "published"` is mandatory on every public read.

### Facade-only cross-plugin access

**Source:** `P/services/public-api.ts` header (rules R3/R4). Events-manager must reach shorts only via `strapi.plugin("creative-works").service("public-api")`.

### Admin UI

Design System only; `useCatalogT()` with `t(key, defaultString)`; react-hook-form `Controller`/`useFieldArray`; error CODES mapped to translated notifications, never prose.

## No Analog Found

| File                                        | Role       | Data Flow    | Reason                                                                                                                                                                                          |
| ------------------------------------------- | ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publish guard in `P/register.ts`            | middleware | event-driven | No `strapi.documents.use` usage in repo; use RESEARCH Pattern 4 and Strapi docs (spike items A3/Pitfall 8)                                                                                      |
| `scripts/seeds/utils/media-upload.ts`       | utility    | file-I/O     | No existing upload helper; use RESEARCH "Seed upload call shape" (`strapi.plugin("upload").service("upload").upload(...)`, lookup via `strapi.db.query("plugin::upload.file")` for idempotency) |
| `A/components/MediaInput/index.tsx` rewrite | component  | file-I/O     | Only analog is Strapi's own `Wysiwyg/Field.js` in node_modules (`useStrapiApp` components `"media-library"`); jest mock `tests/__mocks__/strapi-admin.ts` needs `useStrapiApp`                  |

## Metadata

**Analog search scope:** `apps/strapi/src/plugins/{creative-works,events-manager,venues}`, `src/shared`, `src/bootstrap`, `scripts/seeds`, `tests`.
**Files read:** about 20 (full or targeted ranges). Large file `01-RESEARCH.md` was read to line 495 only; the remaining sections (open questions, assumptions log, validation) were not needed for pattern mapping.
**Pattern extraction date:** 2026-10-18
