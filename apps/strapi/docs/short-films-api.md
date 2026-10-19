# Short Films Public Read API

The public, anonymous read contract for the short-film directory (SDATA-03).
Phase 2 (`/shorts` pages) reads exactly this contract; Phase 3 layers Meilisearch
on top of it without changing it. The contract is costly to change (D-06), so a
unit test (`short-films-api-doc.unit.test.ts`) fails when a route, sort or error
code drifts from this document.

Source of truth in code:

| Concern               | File                                                              |
| --------------------- | ----------------------------------------------------------------- |
| Route table           | `src/plugins/creative-works/server/src/routes/content-api.ts`     |
| Query validation      | `src/plugins/creative-works/server/src/validation/short-films.ts` |
| Reads and projections | `src/plugins/creative-works/server/src/services/short-films.ts`   |
| Error envelope        | `src/plugins/creative-works/server/src/controllers/short-film.ts` |
| Rate limit            | `src/plugins/creative-works/server/src/middlewares/index.ts`      |

## 1. Routes

All routes are `GET`, anonymous (`auth: false`, no role grant needed) and sit
behind the named middleware `plugin::creative-works.short-films-rate-limit`.

| Method | URL                                                            | Handler               | Auth | Rate limit                  |
| ------ | -------------------------------------------------------------- | --------------------- | ---- | --------------------------- |
| GET    | `/api/creative-works/creative-works/short-films`               | `short-film.list`     | none | 600 requests / 60 s per key |
| GET    | `/api/creative-works/creative-works/short-films/featured`      | `short-film.featured` | none | 600 requests / 60 s per key |
| GET    | `/api/creative-works/creative-works/short-films/:slug/related` | `short-film.related`  | none | 600 requests / 60 s per key |
| GET    | `/api/creative-works/creative-works/short-films/:slug`         | `short-film.findOne`  | none | 600 requests / 60 s per key |

Route order is part of the contract: `featured` is registered above `:slug`, and
`:slug/related` above `:slug`, otherwise `:slug` would capture them.

The limiter is a fixed window keyed by client IP (`ctx.state.ip`, then `ctx.ip`).
Behind the proxy every caller may share one IP, so the cap is deliberately
generous: the Next.js server's static generation can burst roughly
films x 3 locales x 2 reads. Counters are per route and per process (in memory).

## 2. Query parameters

Every query schema is strict: any parameter not listed for a route is a
`400 VALIDATION_FAILED` (D-06, D-07). Send only the parameters below; do not add
cache-busters. Facets and text search are not served here (D-10, see section 7).

### `GET /short-films`

| Parameter  | Type    | Default               | Bounds / values                                                             |
| ---------- | ------- | --------------------- | --------------------------------------------------------------------------- |
| `locale`   | string  | default locale (`fr`) | 2-10 characters; must be a configured locale, else `400 UNSUPPORTED_LOCALE` |
| `genre`    | string  | none                  | genre slug, 1-100 characters, trimmed                                       |
| `sort`     | enum    | `publishedAt:desc`    | one of the 8 values below                                                   |
| `page`     | integer | `1`                   | 1 to 10000                                                                  |
| `pageSize` | integer | `24`                  | 1 to 48                                                                     |

`sort` values (D-07): `publishedAt:asc`, `publishedAt:desc`, `releaseYear:asc`,
`releaseYear:desc`, `duration:asc`, `duration:desc`, `title:asc`, `title:desc`.
Any other value is a 400.

### `GET /short-films/featured`

Only `locale` (same rule as above).

### `GET /short-films/:slug` and `GET /short-films/:slug/related`

Only `locale`. The `:slug` path parameter is 1-200 characters from
`A-Z a-z 0-9 . _ ~ -`; anything else is `400 VALIDATION_FAILED`.

## 3. Errors

Failures never carry prose that a client should parse. The stable value is the
code. For the validation and not-found failures it is `error.details.code`; for
the rate limiter it is `error.message`.

| Code                   | HTTP | Where                                    | Meaning                                                   |
| ---------------------- | ---- | ---------------------------------------- | --------------------------------------------------------- |
| `VALIDATION_FAILED`    | 400  | `error.details.code`                     | Unknown or malformed query key/value, bad slug            |
| `UNSUPPORTED_LOCALE`   | 400  | `error.details.code`                     | `locale` is not a configured locale                       |
| `SHORT_FILM_NOT_FOUND` | 404  | `error.details.code`                     | Unknown slug, draft-only short, or a non-short work       |
| `RATE_LIMITED`         | 429  | `error.message` (+ `Retry-After` header) | Over 600 requests in the current 60 s window for this key |
| `INTERNAL_ERROR`       | 500  | `error.details.code`                     | Unmapped failure; logged server side, no internal detail  |

Envelope for the first, second, third and fifth code:

```json
{
  "error": {
    "status": 400,
    "name": "ShortFilmError",
    "message": "Short film request failed",
    "details": { "code": "VALIDATION_FAILED", "issues": [] }
  }
}
```

`details.issues` (per-field problems) is present only for mapped codes. The
rate-limit envelope is different:

```json
{
  "error": {
    "status": 429,
    "name": "TooManyRequestsError",
    "message": "RATE_LIMITED"
  }
}
```

`Retry-After` carries the seconds until the window resets.

## 4. Response shapes

Responses use the flat Strapi v5 shape (no `attributes` wrapper) built from an
explicit allowlist: no numeric `id`, audit fields, upload provider metadata,
`externalIds` or draft-only relations ever appear.

### List

```json
{
  "data": [
    /* ShortFilmSummary */
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 24, "pageCount": 1, "total": 6 }
  }
}
```

`featured` and `related` answer `{ "data": [ ShortFilmSummary ] }` without
`meta`. The detail answers `{ "data": ShortFilmDetail }`.

### ShortFilmSummary keys

`documentId`, `slug`, `locale`, `title`, `originalTitle`, `synopsis`,
`duration`, `releaseYear`, `country`, `language`, `featured`, `featuredRank`,
`publishedAt`, `poster`, `backdrop`, `genres`, `directors`, `availableOnline`,
`hasAwards`.

- `country` and `language` are arrays of codes (empty array when none).
- `genres` is `[{ documentId, slug, name }]`; `directors` is
  `[{ documentId, slug, name }]`.
- `locale` is the locale actually served for this item (see section 5).

### ShortFilmDetail keys

Everything in the summary, plus `rating`, `ageRating`, `photos`, `credits`
(`{ person, creditRole: { slug, department }, customRole, billing }`, ordered by
`billing`), `cast` (`{ person, character: { documentId, name } | null, billing }`),
`distinctions` (`name`, `edition`, `year`, `section`, `category`, `result`,
`awardName`), `videos` (`url`, `videoType`) and `streamingLinks` (`platform`,
`url`, `accessType`, `label`). A credit or cast entry whose person is not
published is dropped.

### Media object

`poster`, `backdrop` and each `photos` entry are
`{ url, alternativeText, width, height, mime, formats }` or `null`. Each key of
`formats` is `{ url, width, height }` only (`hash`, `provider`, `folderPath` and
`provider_metadata` are never exposed).

### Derived fields (D-04)

`directors`, `availableOnline` and `hasAwards` are derived on read and never
stored:

- `directors`: persons credited with the `director` role.
- `availableOnline`: the film has a streaming link or a `full-length` video.
- `hasAwards`: at least one distinction whose result is an award.

## 5. Locale rule

- A short film is public if and only if its default-locale (French) row is
  published. Every read filters on `status: "published"` and `type: "short-film"`,
  so drafts and other work types never surface (D-09).
- Filtering, sorting, paging and counting only read the default-locale rows.
  A translation is overlaid afterwards, for the selected page only, so a partly
  translated catalog cannot corrupt pagination.
- When `locale` is not the default: `title`, `synopsis` and `poster` come from the
  requested locale's published row if it has a non-empty title; genre names use
  their translation when one exists. Otherwise French is served and `locale` on
  that item says `fr`. Relations, `slug` and the derived fields always come from
  the default-locale row.
- `locale` on the item is the source of truth for what was served; do not infer
  it from the request.

## 6. Ordering

- List: the requested `sort`, always followed by `id:desc` as tiebreaker, so rows
  with equal keys keep a stable order and pages never repeat or skip a row.
- Featured (D-05): featured shorts only; `featuredRank` ascending with unranked
  last, then `publishedAt` descending, then `id` descending; at most 12 items.
  Ordered in JavaScript over the newest 100 featured rows so SQLite and Postgres
  cannot differ.
- Related (D-08): other published shorts by the same director first, then shorts
  sharing a genre, each group newest first (`publishedAt:desc`, `id:desc`); the
  source film is excluded, a film matching both appears once, at most 6 items.

## 7. Hand-offs

- **Phase 2** (`/shorts`) reads exactly this contract and sends only the
  allowlisted parameters.
- **Phase 3** adds facets and text search in Meilisearch (SRCH-03); they are not
  served by these routes (D-10). `related` switches to Meilisearch
  similar-documents while `findRelatedDeterministic` stays as the fallback, and
  the response contract does not change. SRCH-05 falls back to the list route when
  Meilisearch is unavailable.
