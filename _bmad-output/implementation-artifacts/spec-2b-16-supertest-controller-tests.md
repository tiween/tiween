---
title: "2B.16 AC#3 — replace ctx-stub controller tests with real Supertest HTTP tests"
type: "chore"
created: "2026-08-11"
baseline_commit: 4fd47dc678aa81b4348b08eef3a10967b3e88144
status: "done"
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2B.16 AC#3 requires the events-manager controller suite to hit
`strapi.server.httpServer` via Supertest with no manual `ctx` construction. The
delivered suite does the opposite — it builds a Koa `ctx` stub and asserts on jest
mocks, so route registration, the admin-auth boundary, and response transport are
all unverified. A handler could be unrouted, or a route left publicly reachable,
and every test would still pass. The spec justified the substitution by an absent
admin-JWT helper; that helper now exists, so the stated reason no longer holds.

**Approach:** Rewrite the controller suite to drive the four admin endpoints over
real HTTP with an admin session token, following the Supertest pattern already
proven by two sibling suites — including one in this same plugin. Behavioural
coverage stays at parity or better, and the unauthenticated case becomes testable
for the first time.

## Boundaries & Constraints

**Always:**

- Obtain credentials via `createAdminSession(strapi)` and send
  `Authorization: Bearer <token>`. A users-permissions JWT is rejected on
  `type: "admin"` routes and must not be used.
- Request the real mounted paths: admin-type plugin routes mount at
  `/<pluginId>/...` with **no** `/admin` and **no** `/api` segment.
- Keep the filename suffix `.controller.test.ts` so `yarn test:integration`'s
  `--testMatch` continues to select it.
- Call `session.destroy()` and `cleanupStrapi()` in teardown, and
  `cleanupContent(strapi)` between tests, matching the sibling suites.
- Preserve every behaviour the stub suite asserts: each handler's happy path,
  its missing-required-field rejection, and its service-error path.

**Ask First:**

- If reaching parity requires editing any production file under
  `server/src/controllers/` or `server/src/routes/` — this story is test-only.
- If an endpoint's real HTTP status disagrees with what the stub suite asserted
  (e.g. a hand-rolled `ctx.badRequest` surfacing as something other than 400).

**Never:**

- Do not wire anything into CI. 2B.16 AC#5 puts CI integration in a separate
  story, and that remains true here.
- Do not add `coverageThreshold` / `collectCoverage` — deferred separately.
- Do not widen the `server` jest project's `testMatch`. Its exclusion of
  boot-based suites from the default `yarn test` run is deliberate and documented.
- Do not keep the `ctx`-stub file alongside the rewrite; AC#3 forbids the pattern.

## I/O & Edge-Case Matrix

| Scenario                           | Input / State                                                                  | Expected Output / Behavior                            | Error Handling                     |
| ---------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------- |
| Bulk screenings, happy path        | `POST /events-manager/bulk-screenings`, admin token, valid `eventId` + `dates` | 200, screenings created and readable                  | N/A                                |
| Bulk screenings, missing field     | same, `eventId` absent                                                         | 400                                                   | Handler's `ctx.badRequest` message |
| Duplicate event, happy path        | `POST /events-manager/duplicate-event`, admin token, valid `eventId`           | 200, copy with new unique slug                        | N/A                                |
| Duplicate event, unknown id        | same, non-existent `eventId`                                                   | 400                                                   | Service throw surfaces as 400      |
| Ticket inventory, happy path       | `PUT /events-manager/ticket-inventory`, admin token, valid screening + counts  | 200, values persisted                                 | N/A                                |
| Ticket inventory, bounds violation | same, `ticketsSold` > `ticketsAvailable`                                       | 400                                                   | Service bounds check               |
| Event stats, happy path            | `GET /events-manager/event-stats/:eventId`, admin token, seeded event          | 200, aggregate payload                                | N/A                                |
| Event stats, unknown id            | same, non-existent id                                                          | 400                                                   | Service throw surfaces as 400      |
| **Unauthenticated**                | any of the four routes, no `Authorization` header                              | 401 — the assertion the stub pattern could never make | Strapi admin auth                  |

</frozen-after-approval>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts` -- the file being rewritten. Stub factory `makeCtx` at :59-78; registry access `(strapi as any).plugin(...).controller(...)` at :46-48. Its header comment at :9-19 states routes live at `/admin/events-manager/...` — **this is wrong**, see below.
- `apps/strapi/src/plugins/events-manager/server/src/__tests__/planning-surface-writes.service.test.ts` -- **primary template**, same plugin. `api()` helper at :56, authenticated `post().set("Authorization", ...)` at :59-60, boot + admin session at :123-124.
- `apps/strapi/src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts` -- richer template. `request((strapi as any).server.httpServer)` at :41, `auth()` wrapper at :42-43, `beforeAll`/`afterAll` lifecycle at :48-53, scoped-RBAC session at :220-224.
- `apps/strapi/tests/helpers/admin.ts` -- `createAdminSession(strapi, { permissions? })` at :78 → `{ user, token, destroy }`. Super-admin when `permissions` omitted.
- `apps/strapi/tests/helpers/strapi.ts` -- `setupStrapi()` at :34 (memoized), `server.mount()` at :63 is what makes `httpServer` reachable; `cleanupStrapi()` at :80.
- `apps/strapi/tests/fixtures/events.ts` -- `seedVenue` :49, `seedMovie` :65, `seedEvent` :80, `seedScreening` :114, `cleanupContent` :144.
- `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` -- admin group at :125. Routes: `POST /bulk-screenings` :127, `POST /duplicate-event` :135, `PUT /ticket-inventory` :143, `GET /event-stats/:eventId` :151. **Read-only.**
- `apps/strapi/src/plugins/events-manager/server/src/controllers/event-manager.ts` -- `createBulkScreenings` :7, `duplicateEvent` :54, `updateTicketInventory` :84, `getEventStats` :112. All rejections go through `ctx.badRequest`. **Read-only.**

**Two corrections the implementer must not re-derive:**

1. The handler is `createBulkScreenings`, **not** `createBulkShowtimes`. The AC text
   in 2B.16 is stale.
2. Admin-type plugin routes mount at `/events-manager/...`, **not**
   `/admin/events-manager/...`. Confirmed by the admin UI calling
   `post("/events-manager/seed", {})` in `admin/src/pages/HomePage.tsx:17`.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts` -- rewrite as a Supertest suite: `request(strapi.server.httpServer)`, admin token from `createAdminSession`, one `describe` per endpoint covering every Matrix row -- delivers AC#3 and removes the forbidden `ctx` stub in one move.
- [x] same file -- add the unauthenticated 401 case for all four routes -- the boundary the stub pattern structurally could not reach.
- [x] same file -- replace the stale scope-note header with a short note recording that AC#3 is now met and why the original deviation lapsed -- keeps the file self-explaining.

**Acceptance Criteria:**

- Given the suite, when it is searched for manual `ctx` construction, then no stub factory remains and no handler is invoked through the controller registry.
- Given `yarn test:integration`, when it runs, then the rewritten suite passes and the other six boot-based suites stay green.
- Given a route deleted from `routes/index.ts`, when the suite runs, then it fails — proving route wiring is genuinely covered rather than bypassed.

## Design Notes

The `dist/` indirection is load-bearing: `strapi-server.js:4-5` resolves the plugin
from `../../../dist/...`, so boot-based suites verify compiled output. `yarn test:integration`
rebuilds via `build:test-dist` first, and `assertTestDistFresh` refuses to boot on a
stale build. Run the suite through that script, never bare `jest`.

Shape to follow, condensed from `planning-surface-writes.service.test.ts`:

```ts
const api = () => request(strapi.server.httpServer)
const auth = (req) => req.set("Authorization", `Bearer ${session.token}`)

beforeAll(async () => {
  strapi = await setupStrapi()
  session = await createAdminSession(strapi)
})
afterAll(async () => {
  await session.destroy()
  await cleanupStrapi()
})
```

Prefer the typed `strapi.server.httpServer` used by `auth-wiring.service.test.ts:34`
over the `(strapi as any)` cast in the venues suite — AC#7 forbids `any`.

## Verification

**Commands:**

- `cd apps/strapi && yarn test:integration` -- expected: all boot-based suites pass; the rewritten controller suite reports the same or a greater test count than the 12 cases the stub suite carried.
- `grep -n "makeCtx\|badRequest: jest.fn\|controller(\"event-manager\")" apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts` -- expected: no matches.
- `cd apps/strapi && yarn lint` -- expected: clean, no `any` introduced.

## Suggested Review Order

**The boundary that was previously untestable**

- Start here: authentication is now proven at the transport, not assumed in prose.
  [`event-manager.controller.test.ts:75`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L75)

- The claim that justified the whole admin-helper detour, finally asserted.
  [`event-manager.controller.test.ts:381`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L381)

**How the ctx stub was replaced**

- Real HTTP handle; typed, so AC#7's no-`any` rule holds.
  [`event-manager.controller.test.ts:72`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L72)

- Header records why the original deviation lapsed and the two stale-AC corrections.
  [`event-manager.controller.test.ts:10`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L10)

- Null-safe error reads: a 500 or HTML body reports itself instead of a TypeError.
  [`event-manager.controller.test.ts:97`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L97)

- Teardown ordering: cleanup runs even when the admin delete rejects.
  [`event-manager.controller.test.ts:122`](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts#L122)

**Records reconciled with reality**

- The deviation this work reverses, marked resolved rather than deleted.
  [`2b-16-...md`](2b-16-events-manager-plugin-test-coverage.md)

- Ledger entry re-partitioned into still-true / now-false / overstated claims.
  [`deferred-work.md`](deferred-work.md)
