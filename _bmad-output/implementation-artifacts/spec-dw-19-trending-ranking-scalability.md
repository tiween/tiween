---
title: "DW-19: Harden the trending endpoint (caching + rate-limiting stopgaps)"
type: "feature"
created: "2026-07-13"
status: "done"
baseline_revision: "84b33a62311c25e6a32854edc2d985c5cff57d3d"
final_revision: "705236d3ab0d7e1f404e1ced779b640a1f666f6b"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** `GET /events/trending` (events-manager plugin) is an in-JS cap-then-rank over up to 500 fully-populated upcoming cinema events on an uncached, unauthenticated, unrate-limited route. Every request re-fetches and re-populates the whole window (movie/venue/images graph) and sums+sorts in JS — a resource-exhaustion surface — and the 500 cap can silently drop a top seller beyond it at scale.

**Approach:** Add the two stopgaps the intent names — a short-TTL in-memory response cache (with single-flight to collapse concurrent cold-cache work) inside `findTrending`, and a per-IP fixed-window rate-limit middleware on the trending route only. Additionally make the silent cap-truncation observable via a warn log. The durable DB-side aggregate rollup (sort-by-materialized-total, no cap, no in-JS rank) stays a documented follow-up — it needs a schema/backfill design and live-DB validation inappropriate for an unattended pass.

## Boundaries & Constraints

**Always:**

- Cache lives in the `eventsService` factory closure (Strapi instantiates the service once ⇒ persists across requests in prod; fresh per test ⇒ no cross-test bleed). Key = `locale|page|pageSize`; never include the per-request `now` in the key.
- Cache and rate-limit stores are plain in-memory (no new deps, no Redis wiring). Bound memory: cap the rate-limit store and sweep expired entries.
- Rate-limit middleware is registered as a named plugin middleware (`plugin::events-manager.trending-rate-limit`), mirroring the existing `plugin::user-engagement.is-owner` policy convention, and attached ONLY to `/events/trending`.
- On limit exceeded: respond `429`, set `Retry-After`, body `{ error: { status: 429, name, message: "RATE_LIMITED" } }` (error CODE, never prose), and do NOT invoke the handler.
- Preserve the existing response shape and ranking semantics exactly (sum(screening.ticketsSold) desc, ties by documentId, cancelled excluded, sum-0 kept last, v5 `{ data, meta.pagination }`). Sanitize still runs at the controller boundary, unchanged.
- New logic is covered by `*.unit.test.ts` (the must-pass Jest gate); use injectable time (a `now()` fn) for deterministic TTL/window tests.

**Block If:**

- Implementing the durable DB-side aggregate rollup would require a schema migration, a new content-type attribute + lifecycle backfill, or raw SQL against Strapi's internal link/draft/publish tables — that is out of scope here; do not attempt it unattended.

**Never:**

- Never add Redis/ioredis or any external cache/limiter dependency in this pass.
- Never change the ranking algorithm, the populate graph, the sanitizers, or the `/events` and `/events/:documentId` routes.
- Never cache with a TTL so long that trending goes visibly stale (keep it tens of seconds).
- Never key the rate limit on anything that lumps by default — but a generous per-IP limit is required so the Next.js SSR caller (server-side, behind revalidate + this cache) is not throttled.

## I/O & Edge-Case Matrix

| Scenario          | Input / State                            | Expected Output / Behavior                                                     | Error Handling                                           |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Cache cold (miss) | first call for key                       | computes: findMany + rank, stores value with TTL, returns v5 result            | No error expected                                        |
| Cache warm (hit)  | 2nd call, same key, within TTL           | returns cached result WITHOUT calling findMany again                           | No error expected                                        |
| Concurrent cold   | N simultaneous misses, same key          | single-flight: findMany called ONCE, all callers get the same result           | On compute reject, inflight cleared so next call retries |
| Cache expiry      | call after TTL elapsed                   | recomputes (findMany called again), refreshes entry                            | No error expected                                        |
| Distinct keys     | different page/pageSize/locale           | cached independently (separate entries)                                        | No error expected                                        |
| Fetch hits cap    | findMany returns TRENDING_FETCH_CAP rows | ranks+returns as today AND `strapi.log.warn` fires (cap truncation observable) | No throw                                                 |
| RL under limit    | count < max within window                | calls `next()` (handler runs)                                                  | No error expected                                        |
| RL exceeded       | count ≥ max within window                | 429 + `Retry-After` + body code `RATE_LIMITED`; `next()` NOT called            | 429 response                                             |
| RL window reset   | next request after window elapsed        | counter resets, `next()` called                                                | No error expected                                        |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` -- `findTrending`; wrap compute in the cache, add cap-hit warn log.
- `apps/strapi/src/plugins/events-manager/server/src/utils/trending-cache.ts` -- NEW: TTL + single-flight cache factory (`createTrendingCache`), injectable `now`.
- `apps/strapi/src/plugins/events-manager/server/src/middlewares/rate-limit.ts` -- NEW: `createRateLimit` fixed-window per-IP limiter factory, injectable `now`.
- `apps/strapi/src/plugins/events-manager/server/src/middlewares/index.ts` -- NEW: named-middleware map (`trending-rate-limit`).
- `apps/strapi/src/plugins/events-manager/server/src/index.ts` -- add `middlewares` to the plugin server export.
- `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` -- attach the middleware (with config) to `/events/trending`.
- `.../utils/__tests__/trending-cache.unit.test.ts`, `.../middlewares/__tests__/rate-limit.unit.test.ts`, `.../services/__tests__/events.unit.test.ts` -- tests.

## Tasks & Acceptance

**Execution:**

- [x] `utils/trending-cache.ts` -- add `createTrendingCache<T>({ ttlMs, now? })` returning `{ getOrCompute(key, compute): Promise<T> }`; hit returns stored value, miss/expiry runs `compute` and stores it, concurrent misses share one inflight promise, a rejected compute clears the inflight so it is retryable.
- [x] `services/events.ts` -- instantiate the cache in the factory closure (`TRENDING_CACHE_TTL_MS = 30_000`); in `findTrending`, `getOrCompute("<locale>|<page>|<pageSize>")` around the existing fetch+rank+paginate; after fetch, if `events.length >= TRENDING_FETCH_CAP` call `strapi.log.warn(...)` naming DW-19's durable rollup. Ranking/shape unchanged.
- [x] `middlewares/rate-limit.ts` -- add `createRateLimit({ max, windowMs, now?, maxKeys? })` → `(ctx, next)`: key by `ctx.state?.ip ?? ctx.ip ?? "unknown"`; fixed window; under limit → `next()`; at/over limit → set 429 + `Retry-After` header + `{ error: { status:429, name:"TooManyRequestsError", message:"RATE_LIMITED" } }`; sweep expired entries when the store grows past `maxKeys`.
- [x] `middlewares/index.ts` + plugin `index.ts` -- export `{ "trending-rate-limit": (config, { strapi }) => createRateLimit({ max: config?.max ?? 100, windowMs: config?.windowMs ?? 60_000 }) }` and wire `middlewares` into the plugin server default export.
- [x] `routes/index.ts` -- on the `/events/trending` route, `config.middlewares = [{ name: "plugin::events-manager.trending-rate-limit", config: { max: 100, windowMs: 60000 } }]`. Leave `/events` and `/events/:documentId` untouched.
- [x] `utils/__tests__/trending-cache.unit.test.ts` -- cover hit/miss/expiry/single-flight/reject-retry with an injected `now`.
- [x] `middlewares/__tests__/rate-limit.unit.test.ts` -- cover under-limit pass-through, over-limit 429 (+Retry-After, code, `next` not called), window reset, per-IP isolation with an injected `now` and a mock ctx.
- [x] `services/__tests__/events.unit.test.ts` -- add: warm-hit skips 2nd findMany; distinct keys cache separately; cap-hit warn fires. Keep all existing findTrending assertions green.

**Acceptance Criteria:**

- Given a warm cache within TTL, when `findTrending` is called again with the same locale/page/pageSize, then the Document Service `findMany` is NOT called a second time and the same ranked result is returned.
- Given two concurrent cold-cache calls for the same key, when they run, then `findMany` executes exactly once and both receive the identical result.
- Given a client that has issued `max` requests inside the window, when it calls `/events/trending` again, then it receives `429` with a `Retry-After` header and body code `RATE_LIMITED`, and the controller handler does not run.
- Given the fetch returns exactly `TRENDING_FETCH_CAP` rows, when `findTrending` runs, then a warn is logged referencing the deferred durable rollup and a valid ranked result is still returned.
- Given `yarn test` (unit gate) and `yarn type-check` in `apps/strapi`, when run, then both pass.

## Spec Change Log

_No bad_spec loopback occurred; the approach in the intent contract held. Review findings were resolved as in-place patches (see Review Triage Log)._

## Review Triage Log

### 2026-07-13 — Review pass (follow-up)

Independent follow-up review (the prior pass flagged `followup_review_recommended: true` because its two high-severity DoS-hardening patches were applied after the adversarial pass). Three fresh adversarial reviewers (blind hunter, edge-case hunter, verification-gap) at session model capability.

- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 2, low 1)
- defer: 0
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` The cache `maxKeys` bound was enforced ONLY in the post-settle `.then()` (and `enforceBound` never evicts in-flight slots), so a burst of concurrent distinct-key cold misses each registered an `{inflight}` slot with no size check — growing the Map past `maxKeys` while computes were outstanding, falsifying the util header's "can never itself become the memory-exhaustion vector" claim (found independently by blind hunter + edge-case hunter). Added a miss-path `reclaimForInsert()` that bounds the store BEFORE registering a new key's in-flight slot (drop expired → evict oldest settled; if every slot is in-flight, compute without registering so the store stays bounded and the overflow caller only forfeits caching). New behavioral regression test proves ≤`maxKeys` joinable in-flight slots survive a 10-key concurrent flood.
  - `[medium]` `[patch]` The wiring test imported `middlewares/index.ts` but never the plugin-root `index.ts`, so dropping/renaming the `middlewares` property on the plugin default export (still valid TS ⇒ type-check + suite stay green) would ship the route unthrottled at boot. Added an assertion pinning `plugin.middlewares[MW_KEY]` to the same factory the route references — closing the third seam (route → map → plugin-export).
  - `[low]` `[patch]` The wiring test asserted the middleware name on `/events/trending` but never inspected the route's actual attached `config` object. Added `expect(entry.config).toEqual({ max: 100, windowMs: 60000 })` so a dropped/wrong route config (silently falling back to the factory default) is caught.
  - Notable rejects: proxy-IP bucket collapse / X-Forwarded-For trust and multi-replica cache dilution (the documented `server.proxy` + shared-Redis upgrade, explicitly out of scope per the intent contract); the singleton-service cross-request assumption being boot-only unverifiable (a unit gate that never boots Strapi cannot assert it — already a documented residual risk); contract-faithful behavior kept verbatim (429 body shape, cap-warn at exactly `TRENDING_FETCH_CAP` rows per the frozen I/O matrix, reject-clears-slot retryability); unreachable inputs (`max<=0`, `windowMs<=0`, `undefined` cached value, direct-service `page`/`pageSize` misuse — all guarded by the controller's zod layer); and cosmetic/latent-only items (cached-result aliasing with no current mutator — re-adjudicated as rejected consistent with the first pass, `now()` double-sampling across hit vs enforce, the forward-compat `ctx.state.ip` branch, single-flight error fan-out no worse than the pre-cache baseline).

### 2026-07-13 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 2, medium 1, low 4)
- defer: 0
- reject: 13
- addressed_findings:
  - `[high]` `[patch]` Trending response cache was unbounded (only the rate-limit store was bounded per spec) — a client-varied `page`/`pageSize`/`locale` key could grow the Map without eviction (a memory-exhaustion vector). Added `maxKeys` (default 500) + on-settle eviction (drop expired, then oldest settled) to `trending-cache.ts`, with a behavioral eviction test.
  - `[high]` `[patch]` Rate-limit store sweep only deleted _expired_ windows, so a flood of _live_ distinct keys (e.g. spoofed `X-Forwarded-For`) grew the Map unbounded. Added hard oldest-eviction when still over `maxKeys` after the expiry sweep, with a live-key-flood eviction test.
  - `[medium]` `[patch]` No test guarded the route→plugin middleware name resolution (`plugin::events-manager.trending-rate-limit`); a rename/typo would silently ship an unthrottled route (unit gate never boots Strapi). Added `middlewares/__tests__/wiring.unit.test.ts` pinning the exported factory key, the route attachment (and that sibling routes stay un-limited), and config forwarding.
  - `[low]` `[patch]` Middleware factory `config`→`createRateLimit` forwarding was untested and the route value equalled the default (masking a broken read). Wiring test now drives a non-default `max` through the factory.
  - `[low]` `[patch]` `Retry-After` was asserted only for presence/type. Added exact-value assertions (full-window and partway-through-window).
  - `[low]` `[patch]` The cache-key `locale` dimension was never exercised and the `|` separator was un-escaped. Wrapped `locale` in `encodeURIComponent` in the cache key and added a two-locale no-collision test.
  - `[low]` `[patch]` Documented the cache's per-process (multi-replica dilution) limitation in the util header, mirroring the limiter's Redis-upgrade caveat.
  - Notable rejects: XFF-spoof bypass and multi-instance limit×N (documented stopgap limitations — the harmful _memory_ halves were patched); fixed-window 2× boundary burst (inherent, accepted); no stale-while-revalidate / 500-on-refresh-error (not worse than the pre-cache baseline that hit the DB every request); `"unknown"` IP shared bucket (defensible fail-bounded default); defensive-clone of the cached result (the controller sanitizer already clones, never mutates); `undefined`-value hit and `undefined`-vs-`""` locale collision (unreachable: `locale` is validated `min(2)`, always an object result); cap-warn false-positive at exactly 500 rows (the read-only I/O matrix specifies warn on CAP rows — kept faithful to the frozen contract).

## Design Notes

Service-closure cache, not module-level singleton: production instantiates `eventsService` once (Strapi memoizes plugin services) so the closure cache persists across requests; each unit test builds a fresh service so no cache state leaks between tests. Key excludes `now` on purpose — reusing a slightly-stale `startDateTime >= now` window within a 30 s TTL is the intended stopgap tradeoff.

Single-flight sketch (in the cache util):

```
const entry = store.get(key)
if (entry?.value && now() < entry.expiresAt) return entry.value      // hit
if (entry?.inflight) return entry.inflight                            // join in-flight
const inflight = compute().then(v => { store.set(key,{value:v,expiresAt:now()+ttlMs}); return v })
                          .catch(e => { store.delete(key); throw e }) // retryable on failure
store.set(key, { inflight }); return inflight
```

Rate limit is a secondary defense: the primary exhaustion mitigation is the cache + single-flight (protects regardless of caller IP). The default 100/min/IP is deliberately generous so the Next.js SSR caller (one IP, already behind ISR `revalidate` + this cache) is never throttled, while crude direct abuse of the public route is still bounded. Multi-instance correctness (shared Redis store, and X-Forwarded-For trust via `server.proxy`) is the documented upgrade — out of scope for this stopgap.

Durable fix (still deferred): sort by a materialized per-event `ticketsSold` total (rollup column maintained on screening writes, or a DB aggregate) so ranking is DB-side with normal pagination — no cap, no in-JS sort, no over-population. Left as follow-up: it requires a schema attribute + lifecycle backfill (or link/draft-publish-aware raw SQL) and live-DB validation that an unattended pass cannot safely do.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: unit gate green, including the new cache/rate-limit/service tests.
- `cd apps/strapi && yarn type-check` -- expected: no TypeScript errors.

## Auto Run Result

Status: done

**Summary.** Hardened `GET /events/trending` (events-manager plugin) — previously an uncached, unauthenticated, unrate-limited in-JS cap-then-rank over up to 500 fully-populated upcoming cinema events (DW-19). Added the two stopgaps the intent named: a short-TTL (30 s) single-flight in-memory response cache inside `findTrending` (the primary exhaustion mitigation — collapses identical + concurrent cold-cache work onto one Document Service fetch), and a per-IP fixed-window rate-limit middleware attached only to the trending route. Cap-truncation is now surfaced via a warn log. The durable DB-side aggregate rollup remains a documented follow-up (needs a schema attribute + lifecycle backfill and live-DB validation unsuitable for an unattended pass).

**Files changed.**

- `apps/strapi/.../services/events.ts` — wrapped `findTrending`'s fetch+rank+paginate in a factory-closure `createTrendingCache` (key `encodeURIComponent(locale)|page|pageSize`, `now` excluded); added the cap-hit warn; ranking/populate/response shape unchanged.
- `apps/strapi/.../utils/trending-cache.ts` (new) — TTL + single-flight cache with injectable clock and a `maxKeys` memory bound (drop-expired then evict-oldest-settled).
- `apps/strapi/.../middlewares/rate-limit.ts` (new) — per-IP fixed-window limiter (429 + `Retry-After` + `RATE_LIMITED` code), injectable clock, memory bound with hard oldest-eviction under a live-key flood.
- `apps/strapi/.../middlewares/index.ts` (new) — named `trending-rate-limit` factory (`plugin::events-manager.trending-rate-limit`).
- `apps/strapi/.../index.ts` — added `middlewares` to the plugin server export.
- `apps/strapi/.../routes/index.ts` — attached the limiter (`max 100 / 60 s`) to `/events/trending` only.
- Tests: new `utils/__tests__/trending-cache.unit.test.ts`, `middlewares/__tests__/rate-limit.unit.test.ts`, `middlewares/__tests__/wiring.unit.test.ts`; extended `services/__tests__/events.unit.test.ts`.

**Review findings breakdown.** 3 adversarial reviewers (blind hunter, edge-case hunter, verification-gap). Patches applied: 7 (2 high — cache + rate-limit memory bounds; 1 medium — wiring guard test; 4 low — config-forwarding test, exact `Retry-After` assertions, locale-key safety + test, per-process doc caveat). intent_gap 0, bad_spec 0, defer 0, reject 13 (documented stopgap limitations, not-worse-than-baseline items, and unreachable/contract-faithful cases — see Review Triage Log).

**Verification.** `cd apps/strapi && yarn test` → 34 suites / 362 tests passing. `yarn type-check` → clean for all changed/added files; the only errors are 9 pre-existing failures in `user-engagement/services/{notification,watchlist}.ts`, verified byte-identical on the clean baseline (`git stash`) and untouched by this work.

**Residual risks.** (1) The durable DB-side rollup is intentionally deferred — at >500 concurrent upcoming cinema events the cap can still drop a top seller (now warn-logged). (2) The cache and limiter are per-process; a multi-replica deploy dilutes the cache and multiplies the effective limit — a shared Redis store is the documented upgrade. (3) Behind `proxy: true`, the per-IP limiter can be evaded via spoofed `X-Forwarded-For` (X-Forwarded-For trust is the documented upgrade); the memory-exhaustion half of that vector is fixed via the hard store bound. (4) The cache's cross-request effectiveness rests on Strapi memoizing the plugin service (one closure/Map across requests) — a boot-only property the unit gate cannot assert; if a future refactor instantiated the service per request the cache would go silently inert (functionally safe, just uncached).

## Auto Run Result — Follow-up Review (2026-07-13)

Status: done

Independent follow-up review of the DW-19 change (the prior pass had recommended one). Three fresh adversarial reviewers (blind hunter, edge-case hunter, verification-gap) at session model capability. Triage: intent_gap 0, bad_spec 0, **patch 3** (medium 2, low 1), defer 0, reject 16.

**Patches applied.**

- `utils/trending-cache.ts` — closed a real memory-bound gap the prior pass's `maxKeys` addition left open: the bound was enforced only at settle time (and never on in-flight slots), so a burst of concurrent distinct-key cold misses grew the Map past `maxKeys` while their computes were outstanding. Added a miss-path `reclaimForInsert()` that bounds the store _before_ registering a new key's in-flight slot (drop expired → evict oldest settled; if all slots are in-flight, compute without registering to stay bounded). Found independently by two reviewers.
- `utils/__tests__/trending-cache.unit.test.ts` — new behavioral regression test: a 10-key concurrent never-settling flood registers at most `maxKeys` joinable in-flight slots (proven via a second identical wave re-computing exactly the overflow keys).
- `middlewares/__tests__/wiring.unit.test.ts` — pinned the plugin-root `middlewares` default-export seam (`plugin.middlewares[MW_KEY]` === the route's factory) so dropping/renaming that export can no longer ship the route unthrottled with a green suite; also pinned the route's actual attached `config` (`{ max: 100, windowMs: 60000 }`).

**Rejects (16).** Documented stopgap limitations (proxy-IP bucketing / XFF trust, multi-replica dilution), boot-only-unverifiable singleton-service assumption, contract-faithful behavior (429 body, cap-warn at exactly CAP, reject-clears-slot), unreachable inputs (`max<=0`, `windowMs<=0`, `undefined` value, direct-service misuse — zod-guarded upstream), and cosmetic/latent-only items (result aliasing with no current mutator, `now()` double-sampling, forward-compat `ctx.state.ip` branch). See the Review Triage Log for the full breakdown.

**Verification.** `cd apps/strapi && yarn test` → 34 suites / **364 tests** passing (was 362; +2 new tests). `yarn type-check` → clean for all DW-19 / events-manager files; the only errors remain the 9 pre-existing `user-engagement/services/{notification,watchlist}.ts` failures, untouched by this work.

**Follow-up recommendation.** `followup_review_recommended: false` — this pass made one localized, low-complexity runtime change (a contained in-memory bound) directly pinned by a behavioral regression test, plus two test-only hardenings, all verified green. The prior pass's rationale for recommending follow-up (its high-severity DoS patches being unreviewed) is now discharged by this review.
