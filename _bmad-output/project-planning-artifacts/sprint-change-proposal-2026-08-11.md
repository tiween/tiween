# Sprint Change Proposal — Defer Redis to post-v1

**Date:** 2026-08-11
**Author:** Ayoub (via bmad-correct-course)
**Trigger:** "Defer Redis for now — let's have a working version first."
**Scope classification:** Moderate (backlog reorganization; no code rewrite)
**Status:** proposed

---

## 1. Issue Summary

Story **2B.10 (Redis Integration for Sessions and Caching)** has sat in `review`
status while being, in fact, entirely unimplemented. The 2026-08-11 code review of
all 30 stories in `review` confirmed this in detail:

- No `redis` service in any of the three compose files
- No `ioredis`, `@strapi-community/plugin-rest-cache`, or
  `provider-rest-cache-redis` in any `package.json`
- No `apps/strapi/config/redis.ts`
- No `rest-cache` plugin entry in `config/plugins.ts`
- No `/health/redis` route

Tasks 3 and 4 in the story file are checked `[x]` for work that was never done.

Meanwhile the _documentation_ is fully built out: `.env.example` declares
`REDIS_HOST/PORT/PASSWORD/DB` and `CACHE_ENABLED`, and `docs/dokploy-setup.md`
carries a complete "Redis Setup" section offering managed and self-hosted options.
The net effect today is that an operator following the deployment guide provisions
a Redis instance that nothing connects to.

Rather than implement the story to clear the discrepancy, the decision is to
**formally defer Redis to post-v1** and close the gap between documentation and
reality in the other direction.

---

## 2. Impact Analysis

### 2.1 What Redis was specced to provide, and what actually provides it now

Redis was named in `requirements-inventory.md:198` as "required for session
management, ticket inventory locks, rate limiting". Three of those four needs are
already met without it, and the fourth is met adequately for v1:

| Specced need           | Current mechanism                                                                                                                                             | Adequate for v1?                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Session management     | Stateless JWT (NextAuth JWT strategy + Strapi users-permissions JWT). There is no server-side session to store.                                               | Yes — the requirement was never real. |
| Ticket inventory locks | PostgreSQL. Story 2C.4 implemented `strapi.db.transaction` wrapping an atomic capacity-guarded `UPDATE ... WHERE tickets_sold + :qty <= tickets_available`.   | Yes — and already ratified.           |
| Rate limiting          | In-process fixed-window per-IP limiter (`apps/strapi/src/shared/rate-limit.ts`), a **secondary** defense behind the primary cache + single-flight mitigation. | Yes, at one instance.                 |
| API response caching   | In-process cache + single-flight in `findTrending`, plus Next.js ISR `revalidate` upstream.                                                                   | Yes, at v1 traffic.                   |

The architecture document already anticipated this. `architecture.md:591` states
that DB-level atomicity is "the correctness floor and needs no new moving parts",
explicitly demoting Redis locks to an option for checkout _reservations_ later
(FR64 territory). The rate limiter's own module header likewise documents
"multi-instance correctness (a shared Redis store)" as the known deferred upgrade.

**This proposal therefore ratifies the architecture as already written, rather
than departing from it.**

### 2.2 The load-bearing assumption

In-process rate limiting and in-process caching are correct **only on a single
instance**. `docker-compose.prod.yml:39` and `:104` both declare `replicas: 1`,
which is what makes the current design sound.

If the deployment ever scales horizontally without Redis:

- Per-IP rate limits multiply by instance count (N instances → N× the intended ceiling)
- Each instance keeps a divergent trending cache, so users see inconsistent ordering
- Cache invalidation on content update reaches only the instance that handled the write

This is the single most important consequence of the deferral, and it is currently
implicit in a compose file. **Section 4.7 makes it an explicit, documented v1
constraint** so that scaling cannot silently break correctness.

### 2.3 Artifact impact

| Artifact                          | Impact                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sprint-status.yaml`              | 2b-10 status `review` → `deferred`                                                                                                                                                               |
| `2b-10-*.md` (story)              | Status → deferred; false `[x]` task marks corrected; descope rationale recorded                                                                                                                  |
| `epic-2b-*.md`                    | Story 2B.10 marked POST-V1 with rationale                                                                                                                                                        |
| `epics/index.md`                  | 2B.10 tag `[MVP]` → `[POST-V1]`                                                                                                                                                                  |
| `epics/epic-list.md`              | Two Redis lines moved to Phase 2 / annotated                                                                                                                                                     |
| `epics/requirements-inventory.md` | Redis Integration reclassified post-v1, with the three superseding mechanisms named                                                                                                              |
| `epic-1-*.md`                     | AC references to a Redis container removed (this is why story 1-8 was scored as failing AC1)                                                                                                     |
| `project-context.md`              | **Highest-value edit** — stack table and the "Rate limit with Redis" rule; this file is loaded by every AI agent, so leaving it stale causes agents to keep coding against absent infrastructure |
| `architecture.md`                 | New explicit v1 single-instance constraint                                                                                                                                                       |
| `.env.example`                    | `REDIS_*` + `CACHE_ENABLED` stripped, deferral noted                                                                                                                                             |
| `docs/dokploy-setup.md`           | "Redis Setup" section stripped, deferral noted                                                                                                                                                   |
| `deferred-work.md`                | 2b-10 entry resolved-by-descope; 1-8's "no Redis service" finding reclassified as by-design                                                                                                      |

### 2.4 Technical impact

**No code changes.** Nothing imports a Redis client, so there is nothing to remove.
This is entirely a documentation, planning-artifact, and status change. The
in-process stopgaps stay exactly as they are — they are now the _sanctioned_ v1
design rather than an acknowledged shortfall.

---

## 3. Recommended Approach

**Direct Adjustment** — descope one story and reconcile the artifacts that
reference it. No rollback (nothing was built), and no MVP-goal change (Redis was
infrastructure, never a user-facing capability).

- **Effort:** ~1 hour of artifact edits, no code, no tests, no migration
- **Risk:** Low. The only new exposure is the documented single-instance
  constraint, which is the status quo made visible rather than a new limitation.
- **Timeline impact:** Net positive. Removes a story from the v1 path and
  eliminates an operator step (provisioning unused Redis).

**Rejected alternative — implement 2B.10 now:** it would add a container, a
dependency, and a health check to serve needs that are already met, on a
single-instance deployment where the benefit is nil. That is the opposite of
"a working version first".

---

## 4. Detailed Change Proposals

### 4.1 `_bmad-output/implementation-artifacts/sprint-status.yaml`

```
OLD:  2b-10-redis-integration-for-sessions-and-caching: review
NEW:  2b-10-redis-integration-for-sessions-and-caching: deferred
```

Plus a preceding comment recording the 2026-08-11 deferral and pointing at this
proposal, and `last_updated: 08-11-2026`.

_Rationale:_ `deferred` is the status the loop skips, which is the intended
behavior — 2b-10 should not be picked up by an unattended dev pass.

### 4.2 Story file `2b-10-redis-integration-for-sessions-and-caching.md`

- `Status:` → `deferred`
- Correct the false completion marks on Tasks 3 and 4 (they claim implementation
  that does not exist — leaving them checked would corrupt any future audit)
- Append a **Descope Note (2026-08-11)** stating what superseded each AC

_Rationale:_ the story file is the record of record; a deferred story with
falsely-checked tasks is worse than an open one.

### 4.3 `epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md`

Prepend to the Story 2B.10 block:

```
> **DEFERRED POST-V1 (2026-08-11)** — see
> `sprint-change-proposal-2026-08-11.md`. Sessions are stateless JWT; inventory
> locks are PostgreSQL-atomic (2C.4); rate limiting and response caching run
> in-process, which is correct at the v1 single-instance deployment. Redis
> returns as the prerequisite for horizontal scaling.
```

### 4.4 `epics/index.md` and `epics/epic-list.md`

- `index.md:82` — `[MVP]` → `[POST-V1]`
- `epic-list.md:72` — "Redis integration (sessions, caching)" → annotate
  `(DEFERRED post-v1, 2026-08-11)`
- `epic-list.md:183` — "Session management with Redis" → "Session management
  (stateless JWT)". This line is simply wrong as written: sessions were never
  Redis-backed.

### 4.5 `epics/requirements-inventory.md:198`

```
OLD: - **Redis Integration:** Required for session management, ticket inventory
       locks, rate limiting

NEW: - **Redis Integration:** DEFERRED post-v1 (2026-08-11). Sessions are
       stateless JWT; inventory locks are PostgreSQL-atomic (2C.4); rate
       limiting is in-process and correct at single-instance. Redis is the
       prerequisite for horizontal scaling — see
       `sprint-change-proposal-2026-08-11.md`.
```

### 4.6 `epics/epic-1-project-foundation-infrastructure.md:192,200`

Remove `- Redis container` from the docker-compose AC and change
`(client → strapi → postgres/redis)` to `(client → strapi → postgres)`.

_Rationale:_ this AC is the reason story 1-8 was scored as failing AC1 in the code
review. Removing it converts a standing false failure into a correct pass.

### 4.7 `project-context.md` — the highest-value edit

```
OLD (line 31):
| **Cache** | Redis | 7.x | Sessions, rate limiting |

NEW:
| **Cache** | _(none — in-process)_ | — | Redis DEFERRED post-v1 (2026-08-11); v1 runs single-instance |
```

```
OLD (line 188):
- **Rate limit with Redis** - Protect sensitive endpoints

NEW:
- **Rate limit in-process** - `src/shared/rate-limit.ts` (per-IP fixed window).
  Redis-backed limiting is post-v1; VALID ONLY AT SINGLE-INSTANCE — see the
  scaling constraint below.
```

Plus a new constraint block:

```
### v1 Deployment Constraint — single instance

v1 runs `replicas: 1` (docker-compose.prod.yml). Rate limiting and the trending
cache are IN-PROCESS and are correct only under that assumption. Do NOT scale
horizontally without first implementing story 2B.10 (Redis): with N instances,
per-IP rate limits multiply by N, trending caches diverge per instance, and cache
invalidation reaches only the instance that handled the write.
```

_Rationale:_ every AI agent loads this file. Left stale, agents will keep writing
code against a Redis that is not there — which is precisely how the original
discrepancy survived this long.

### 4.8 `architecture.md`

Add the same single-instance constraint to the deployment section, cross-linked to
the existing `architecture.md:591` note on DB-level atomicity, so the spine records
both the decision and its boundary condition.

### 4.9 `.env.example` (lines 19-29)

Strip the whole REDIS block and `CACHE_ENABLED`, replacing with:

```
# REDIS — deferred post-v1 (2026-08-11, sprint-change-proposal-2026-08-11.md).
# Do not provision Redis for v1; nothing connects to it.
```

### 4.10 `docs/dokploy-setup.md` (lines 335-346)

Replace the "Redis Setup" section (Option A managed / Option B self-hosted) with a
one-line deferral note pointing at this proposal.

_Rationale:_ this section is the direct cause of operators provisioning unused
infrastructure.

### 4.11 `deferred-work.md`

- Mark the 2026-08-11 Redis entry `status: resolved-by-descope 2026-08-11` with
  this proposal as the resolution
- Amend the 1-8 entry: "AC1's Redis service does not exist in any compose file"
  is now **by design**, not a defect

---

## 5. Implementation Handoff

**Scope: Moderate** — backlog reorganization across 12 artifacts, no code.

**Route to:** Developer agent (direct implementation — all edits are specified
above with exact old → new text).

**Success criteria:**

1. `grep -ri redis` across `_bmad-output/`, `.env.example`, and `docs/` returns
   only deliberate deferral notes — no requirement, AC, or config presented as active
2. `sprint-status.yaml` shows 2b-10 as `deferred`; the loop skips it
3. `project-context.md` no longer instructs agents to rate limit with Redis
4. The single-instance constraint appears in both `project-context.md` and
   `architecture.md`
5. No code changes in the diff — `apps/` untouched except nothing at all

**Explicitly out of scope:** any change to the in-process rate limiter or trending
cache. They are now the sanctioned v1 design and should not be touched by this work.

**Re-entry trigger:** revisit 2B.10 when either (a) horizontal scaling is on the
table, or (b) Epic 6 ticketing is un-deferred and checkout _reservations_ (FR64)
need distributed locks beyond the DB-atomic floor.
