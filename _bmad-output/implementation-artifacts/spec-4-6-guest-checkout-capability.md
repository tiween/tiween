---
title: "Guest Checkout Capability — Guest-Order Account Linking (groundwork)"
type: "feature"
created: "2026-07-09"
status: "done"
final_revision: "e7398bed94f73d7aafcff900ebc46506f8ea77e2"
baseline_revision: "78d852b411d662636bbfa9d527a89623af0f734a"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Story 4.6's user-facing guest checkout (choose guest → email only → pay → receive tickets → offered an account) is built on the Ticketing/payment flow of **Epic 6**, which is entirely unbuilt Phase-2 backlog (no checkout route, no payment endpoint, no ticket email — verified). What the epic context _does_ direct us to build now is the **guest-identity groundwork so that a later account created with the same email inherits prior guest purchases** — AC clause: "if I later create an account with that email, my purchase history is linked." That linking does not exist anywhere: the `TicketOrder` model already carries an optional `user` relation plus `guestEmail`, but no code ever connects a guest order to a newly-created account.

**Approach:** Add an authoritative, server-side `linkGuestOrders(email, userDocumentId)` method to the ticketing plugin's `order` service that finds guest orders whose `guestEmail` matches (case-insensitively) and back-fills their `user` relation. Trigger it from the existing app-level user `afterCreate` lifecycle subscriber so it fires on **every** account-creation path (email/password register, social callback, admin-created), error-isolated so it can never break account creation.

## Boundaries & Constraints

**Always:**

- Linking is authoritative and server-side only. Match `guestEmail` to the new user's email **case-insensitively** (Document Service `$eqi`; also lower/trim the incoming email defensively).
- **Idempotent**: only orders with no `user` are linked; already-linked orders are skipped. Setting `user` is the linkage — retain `guestEmail` as an audit trail (do not clear it).
- **Error-isolated**: linking runs inside `try/catch` in the lifecycle helper and never rethrows — a linking failure (or a missing/disabled ticketing plugin) must not fail user creation or the welcome email.
- Linking logic lives in the **ticketing plugin** (it owns orders and may depend on users-permissions). The users-permissions plugin stays dependency-free; the app-level `src/lifeCycles/user.ts` subscriber is the glue that wires the user event to the ticketing service.
- Use Strapi v5 Document Service API and `documentId` relations, matching the existing `order.ts` patterns. New tests are named `*.unit.test.ts` (the only glob the default `yarn test` gate runs).

**Block If:**

- The ticketing plugin's `ticket-order` content type does **not** expose both a `guestEmail` field and an optional (non-required) `user` relation — this plan depends on that shape. (Verified present at planning time; guard against drift.)

**Never:**

- No checkout/cart/payment UI, no guest email-capture entry point, no post-purchase "create an account" nudge, no ticket email delivery — all depend on the unbuilt Epic 6 (Phase 2). Do not wire the pre-existing presentational `features/tickets/GuestCheckoutForm` / `useGuestCheckout` (they have no live checkout route to attach to).
- No new HTTP endpoint and no order-creation route. No client (`apps/client`) changes.

## I/O & Edge-Case Matrix

`linkGuestOrders(email, userDocumentId)` and the lifecycle trigger:

| Scenario         | Input / State                                                                      | Expected Output / Behavior                                  | Error Handling                                   |
| ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Match & link     | user created email `Buyer@X.com`; 2 orders `guestEmail="buyer@x.com"`, `user=null` | both orders updated with `user=userDocumentId`; returns `2` | No error expected                                |
| Case-insensitive | `guestEmail="BUYER@x.com"`, new email `buyer@x.com`                                | matched and linked                                          | No error expected                                |
| No matches       | email with no guest orders                                                         | returns `0`; no updates                                     | No error expected                                |
| Already linked   | `guestEmail` matches but order already has a `user`                                | skipped; not re-updated; not counted                        | No error expected                                |
| Missing input    | `email` or `userDocumentId` empty/undefined                                        | returns `0`; no query, no update                            | No error expected                                |
| Service throws   | ticketing `linkGuestOrders` rejects during `afterCreate`                           | user creation & welcome email still succeed; error logged   | Swallowed in lifecycle `try/catch`, not rethrown |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` -- add `linkGuestOrders(email, userDocumentId)` to the `orderService` object. Reuses the module's `ORDER_UID` and the existing `strapi.documents(ORDER_UID)` findMany/update patterns.
- `apps/strapi/src/lifeCycles/user.ts` -- in the existing `afterCreate` subscriber, after `sendEmail`, call a new factored-out `linkGuestOrdersForUser(strapi, event)` helper (mirrors how `sendEmail` is structured). Helper reads `email`+`documentId` from `event.result`, calls `strapi.plugin("ticketing").service("order").linkGuestOrders(...)`, and `try/catch`-logs. This subscriber is registered via `registerUserSubscriber` in `src/index.ts` and covers all account-creation paths.
- `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/order-link-guest.unit.test.ts` (NEW) -- unit-test `linkGuestOrders` with a mocked `strapi.documents` (mirror the `buildStrapi` mock style in `order.unit.test.ts`).
- `apps/strapi/src/lifeCycles/user.unit.test.ts` (NEW) -- unit-test `linkGuestOrdersForUser`: delegates with `email`+`documentId`; no-op on missing fields; swallows a rejecting service so it does not throw.
- `apps/strapi/src/plugins/ticketing/server/src/content-types/ticket-order/schema.json` -- read-only reference confirming `guestEmail` (email) + optional `user` (manyToOne users-permissions) exist. Do not modify.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` -- add `async linkGuestOrders(email: string, userDocumentId: string): Promise<number>`: guard empty inputs → `0`; normalize `email` (trim+lowercase); `findMany({ filters: { guestEmail: { $eqi: normalized } }, populate: ["user"] })`; for each order without a `user`, `update({ documentId, data: { user: userDocumentId } })`; return the count linked.
- [x] `apps/strapi/src/lifeCycles/user.ts` -- factor out `linkGuestOrdersForUser(strapi, event)` (guards missing `email`/`documentId`; wraps the ticketing service call in `try/catch`, logs the linked count / any error) and invoke it inside `afterCreate` after `sendEmail`.
- [x] `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/order-link-guest.unit.test.ts` (NEW) -- cover every I/O Matrix row for `linkGuestOrders`: match-&-link (count + update args), case-insensitive match, no-matches → 0, already-linked skipped, missing input → 0 with no query.
- [x] `apps/strapi/src/lifeCycles/user.unit.test.ts` (NEW) -- cover the lifecycle helper: delegates to `linkGuestOrders` with the created user's `email`+`documentId`; no-op when `event.result` lacks `email`/`documentId`; a rejecting service is swallowed (helper resolves, does not throw).

**Acceptance Criteria:**

- Given guest orders exist with `guestEmail` equal (ignoring case) to an email, when a user account is created with that email through any path (register, social callback, admin), then every previously-unlinked matching order has its `user` relation set to the new user and remains queryable as that user's purchase history.
- Given an order whose `guestEmail` matches but which already has a `user`, when linking runs, then it is left unchanged (idempotent, no duplicate re-link).
- Given the ticketing linking call throws or the plugin is unavailable, when a user is created, then account creation and the welcome email still succeed and the error is logged, never surfaced to the auth flow.
- Given a new account whose email matches no guest orders, when it is created, then no orders are modified and normal registration behavior is unchanged.

## Spec Change Log

_No `bad_spec` loopback occurred. The review confirmed the captured intent and approach; findings were one in-scope patch (a `$eqi` wildcard-match hardening) plus deferrals coupled to the unbuilt Epic 6 checkout flow._

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 6: (high 1, medium 4, low 1)
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` `$eqi` compiles to `LOWER(col) LIKE LOWER(?)` with no wildcard escaping (verified in `@strapi/database/dist/query/helpers/where.js:184`), so a registrant's email containing `_`/`%` (valid local-part chars) could link a _different_ guest's orders. Added an in-memory exact case-insensitive equality guard in `linkGuestOrders` plus a regression test (`order-link-guest.unit.test.ts` wildcard-guard case).

## Design Notes

Why the trigger is the app-level user lifecycle, not the users-permissions `auth.register` override: `afterCreate` on `plugin::users-permissions.user` fires uniformly for email/password register, social `auth.callback`, and admin-created users — one hook covers "if I later create an account with that email" for all of them, and keeps the users-permissions extension free of any ticketing dependency (the epic's "users-permissions depends on nothing" rule). The ticketing plugin owns the order write; the lifecycle file is glue that already knows about the user model.

Shape (both pieces small; mirror existing `sendEmail`/`order.ts` styles):

```ts
// order.ts — orderService method
async linkGuestOrders(email, userDocumentId) {
  if (!email || !userDocumentId) return 0
  const normalized = email.trim().toLowerCase()
  if (!normalized) return 0
  const orders = await strapi.documents(ORDER_UID).findMany({
    filters: { guestEmail: { $eqi: normalized } },
    populate: ["user"],
  })
  let linked = 0
  for (const order of orders) {
    if (order.user) continue // idempotent: skip already-linked
    await strapi.documents(ORDER_UID).update({
      documentId: order.documentId,
      data: { user: userDocumentId },
    })
    linked++
  }
  return linked
}

// user.ts — lifecycle glue, error-isolated
const linkGuestOrdersForUser = async (strapi, event) => {
  const { email, documentId } = event.result ?? {}
  if (!email || !documentId) return
  try {
    const n = await strapi.plugin("ticketing").service("order")
      .linkGuestOrders(email, documentId)
    if (n > 0) console.log(`Linked ${n} guest order(s) to ${email}.`)
  } catch (err) {
    console.error("Guest-order linking failed on user create:", err)
  }
}
```

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: the unit gate passes, including the two new `*.unit.test.ts` files (all I/O Matrix rows and the lifecycle error-isolation case).
- `yarn type-check` (repo root) -- expected: no TypeScript errors introduced by the new service method or lifecycle helper.

## Auto Run Result

Status: **done**

**Summary:** Built the buildable slice of Story 4.6 — the guest-identity groundwork the epic context prescribes ("a later account created with the same email inherits prior guest purchases"). The user-facing guest checkout (guest email capture at checkout, payment, ticket email, post-purchase account offer) depends on the unbuilt Phase-2 Epic 6 and is explicitly out of scope. Added an authoritative, server-side email→guest-order linking mechanism that back-fills the `user` relation on matching guest orders whenever an account is created, wired via the users-permissions `afterCreate` lifecycle so it covers every account-creation path, and error-isolated so it can never break account creation.

**Files changed:**

- `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` — added `linkGuestOrders(email, userDocumentId)`: case-insensitive `$eqi` match + in-memory exact-equality guard (defuses `$eqi`'s `LIKE` wildcard semantics), idempotent (skips already-linked), retains `guestEmail` as audit trail, returns the count linked.
- `apps/strapi/src/lifeCycles/user.ts` — added the exported `linkGuestOrdersForUser` lifecycle helper (mirrors the existing `sendEmail` factoring) and invoked it in `afterCreate`; try/catch-isolated so a linking failure/missing plugin never breaks user creation or the welcome email.
- `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/order-link-guest.unit.test.ts` (NEW) — 7 unit tests: match-&-link, case-insensitive, no-match, already-linked, wildcard-guard over-match, and both missing-input cases.
- `apps/strapi/src/lifeCycles/user.unit.test.ts` (NEW) — 3 unit tests: delegation, no-op on missing fields, error-isolation.

**Review findings:** intent*gap 0, bad_spec 0. **1 patch applied** — `$eqi` compiles to `LOWER(col) LIKE LOWER(?)` with no wildcard escaping (verified in `@strapi/database/dist/query/helpers/where.js:184`), so an email with `*`/`%`could over-match a different guest's orders; added an exact-equality guard + regression test. **6 deferred** to Epic 6 (recorded in`deferred-work.md`): (HIGH) gate linking on verified email ownership; restrict to appropriate `paymentStatus`; transactional/partial-failure robustness; normalize `guestEmail`on write; add a`guestEmail`DB index; add boot-based integration coverage for the real`$eqi`/relation-write/afterCreate wiring. **6 rejected** as noise/disproven (findMany has no default page-limit; user email uniqueness precludes the concurrent-create race; skip-if-owned-by-another is correct; `console.\*` matches the file's convention; the loose cast and email-change relinking were out-of-scope nitpicks).

**Follow-up review recommended:** false — the sole code change from review was one localized medium patch already covered by a new regression test.

**Verification:** `cd apps/strapi && yarn test` → 15 suites, **193 tests, all pass** (includes the two new suites; the logged `console.error` is the intentional error-isolation assertion). `yarn type-check` (repo root) → **pass** (2/2 tasks successful).

**Residual risks:** All linking behavior is asserted only against mocked Strapi in the default unit gate; the real `$eqi` semantics and relation-write shape are corroborated by existing in-repo usage but not exercised by a booted-Strapi test (deferred). The linking mechanism is inert groundwork until Epic 6 exposes guest-order creation — the HIGH email-ownership deferral **must** be resolved before that flow ships.
