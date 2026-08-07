---
title: "Fix RSC serialization crash — server routes passing function labels to client islands"
type: "bugfix"
created: "2026-08-07"
status: "done"
review_loop_iteration: 0
baseline_commit: "78186c5efd2702059918e28e9cb34803e7424218"
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three server routes build i18n label bundles containing arrow functions (`(count) => t(key, {count})`) and pass them as props to `"use client"` islands. React cannot serialize functions across the RSC boundary, so `/[locale]`, `/[locale]/events` and `/[locale]/events/[documentId]` all crash with _"Functions cannot be passed directly to Client Components"_.

**Approach:** Delete the parameterized label fields from the label contracts entirely. The client components that render them (`BottomNav`, `EventCard`, `EventDetailPage`) call `useTranslations` themselves — `NextIntlClientProvider` is already mounted in the root layout and inherits the full message catalog, so client-side lookup works today. Every remaining label prop stays a plain string, which makes the type system the permanent guard against this bug class.

## Boundaries & Constraints

**Always:**

- Reuse existing message keys — `home.bottomNav.unscannedTickets`, `home.bottomNav.notifications`, `events.priceFrom`, `events.ticketsAvailable` all exist in `fr`/`ar`/`en` already. Add no new keys.
- After the change, no label interface reachable from a server route may declare a function type.
- Follow the repo's established client-i18n test convention: `vi.mock("next-intl", () => ({ useTranslations: () => (key, values) => ... }))`, echoing the key (see `src/app/[locale]/auth/notifications/_components/NotificationItem.test.tsx`).
- Keep the `labels?: X` prop + `defaultLabels` pattern for the fields that remain plain strings — Storybook and existing tests depend on it.

**Ask First:**

- Any change that requires a new message key or a locale-file edit.
- Removing/renaming a label field that is NOT one of the five parameterized ones listed above.

**Never:**

- Do not migrate the whole label-prop architecture to `useTranslations`. Only the parameterized (function) fields move.
- Do not reintroduce functions as props, and do not work around it with `"use server"` action wrappers.
- Do not touch `page.city.tsx` / `page.venue.tsx` (non-route variants that pass no labels) beyond what type errors force.
- Do not edit `apps/client/locales/*.json`.

## I/O & Edge-Case Matrix

| Scenario                    | Input / State                                       | Expected Output / Behavior                                                        | Error Handling                     |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| Homepage renders            | `GET /fr` with the server label bundle              | Page renders; every value in the `labels` prop tree is a string (no functions)    | N/A                                |
| Ticket badge label          | `BottomNav` with `ticketCount={3}`                  | Badge `aria-label` = `home.bottomNav.unscannedTickets` resolved with `{count: 3}` | N/A                                |
| Account badge label         | `BottomNav` with `accountBadgeCount={5}`            | Badge `aria-label` = `home.bottomNav.notifications` resolved with `{count: 5}`    | N/A                                |
| Priced event card           | `EventCard` for an event with `price` + `currency`  | Renders `events.priceFrom` resolved with the formatted price                      | N/A                                |
| Free / priceless event card | `EventCard` for an event with no `price`            | Price line omitted exactly as before — no empty "From " string                    | N/A                                |
| Listing route label bundle  | `await EventsListingRoute(props)` in the route test | Captured `labels` prop deep-contains zero function values                         | Test fails if a function reappears |

</frozen-after-approval>

## Code Map

**Broken server routes (remove the arrow-function label entries):**

- `apps/client/src/app/[locale]/page.tsx:89-92` -- `buildLabels()` sets `bottomNav.unscannedTickets` / `bottomNav.notifications` as functions. Reported crash site.
- `apps/client/src/app/[locale]/events/page.tsx:92` -- `buildLabels()` sets `card.priceFrom` as a function.
- `apps/client/src/app/[locale]/events/[documentId]/page.tsx:169-170` -- sets `priceFrom` / `ticketsAvailable` as functions. Note line 178 already uses the correct serializable pattern (`t.raw("dateRange")`).

**Client components that must own the lookup:**

- `apps/client/src/components/layout/BottomNav/BottomNav.tsx:21-39,97-100` -- `BottomNavLabels` declares both function fields; `badgeLabel` at :97-100 is the only call site. Namespace `home.bottomNav`.
- `apps/client/src/features/events/components/EventCard/EventCard.tsx:25-36,266` -- `EventCardLabels.priceFrom`; sole call site at :266 wraps `formatPrice(event.price, event.currency)`. Namespace `events`.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx:67-68,98-99,591` -- `priceFrom` used at :591; `ticketsAvailable` is **declared and defaulted but never called** — delete the field outright rather than wiring it. Namespace `events`.

**Type cascade (compiler will point at these; update declarations + `defaultLabels`):**

- `apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx:44-45,94` -- nested `bottomNav` label shape + defaults. Renders `<BottomNav>` at :540.
- `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx:36-37,74` and `HomePage.tsx:34-35,67` -- same nested shape (only reachable from the non-route `page.city.tsx` / `page.venue.tsx` variants, which pass no labels).
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx:50,260` -- `card: EventCardLabels`, drilled to `<EventCard labels={labels.card}>`.
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx:90-94,295` -- builds `EventCardLabels` in a **client** component (not a crash today, but the field is going away).

**Tests / stories to update:**

- `apps/client/src/components/layout/BottomNav/BottomNav.test.tsx:18` and `BottomNav.stories.tsx:15`
- `apps/client/src/features/events/components/EventCard/EventCard.test.tsx:218` and `EventCard.stories.tsx:66`
- `apps/client/src/features/events/components/EventsListing/EventsListing.test.tsx:85`
- `apps/client/src/app/[locale]/events/page.test.tsx` -- already does `render(await EventsListingRoute(props))` with `next-intl/server` mocked to echo keys; the natural home for the serializability assertion.

**Read-only evidence (do not change):**

- `apps/client/src/app/[locale]/layout.tsx:102` → `src/components/providers/ServerProviders.tsx` mounts `NextIntlClientProvider` with no explicit `messages`, so next-intl inherits the whole catalog from `src/lib/i18n.ts` — `useTranslations` in client components resolves without further wiring.
- `apps/client/locales/{fr,ar,en}.json` -- all five keys verified present in all three locales with the right ICU placeholders.
- `apps/client/vitest.config.ts` -- `include` is an explicit allow-list. `src/components/layout/**/*.test.tsx`, `src/features/events/components/EventCard/**/*.test.tsx`, `EventDetailPage/**`, `EventsListing/**` and `src/app/**/events/*.test.tsx` are already listed; no glob changes needed for the files above.

**Deliberately out of scope (unrendered dead components — no RSC boundary, flagged not fixed):**

- `EventDetailPageDesktop.tsx:56,64` and `EventDetailPageWithMap.tsx:66` still declare function labels. Neither is rendered anywhere (`grep '<EventDetailPageDesktop'` → no hits). Log to `deferred-work.md` instead of refactoring.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/components/layout/BottomNav/BottomNav.tsx` -- drop `unscannedTickets`/`notifications` from `BottomNavLabels` + `defaultLabels`; add `useTranslations("home.bottomNav")` and build `badgeLabel` from it -- moves the parameterized lookup to the client side of the boundary.
- [x] `apps/client/src/features/events/components/EventCard/EventCard.tsx` -- drop `priceFrom` from `EventCardLabels` + `defaultLabels`; render `t("priceFrom", { price: formatPrice(...) })` via `useTranslations("events")` at :266 -- same, for the listing card.
- [x] `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- drop `priceFrom` and the unused `ticketsAvailable` from the labels type + defaults; render `priceFrom` at :591 via `useTranslations("events")`.
- [x] `apps/client/src/app/[locale]/page.tsx`, `.../events/page.tsx`, `.../events/[documentId]/page.tsx` -- delete the five arrow-function label entries from the server `buildLabels`/label objects -- removes the unserializable props at source.
- [x] `apps/client/src/features/events/components/HomePage/{HomePageWithVenue,HomePageWithCity,HomePage}.tsx`, `.../EventsListing/EventsListing.tsx`, `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` -- remove the now-deleted fields from nested label types and `defaultLabels` -- clears the type cascade.
- [x] `apps/client/src/components/layout/BottomNav/BottomNav.test.tsx` -- mock `next-intl`'s `useTranslations` (key-echo + `{count}` interpolation) and assert both badge `aria-label`s cover the I/O matrix rows.
- [x] `apps/client/src/features/events/components/EventCard/EventCard.test.tsx` -- same mock; assert the priced-card and priceless-card rows.
- [x] `apps/client/src/features/events/components/EventsListing/EventsListing.test.tsx`, `.../EventCard/EventCard.stories.tsx`, `.../BottomNav/BottomNav.stories.tsx` -- drop the removed fields from their label fixtures.
- [x] `apps/client/src/app/[locale]/events/page.test.tsx` -- capture the `labels` prop handed to the mocked `EventsListing` and assert, with a small recursive walker, that no value anywhere in the tree is a function -- the regression guard for the whole bug class.
- [x] `apps/client/src/app/[locale]/page.test.tsx` (new) + `apps/client/vitest.config.ts` -- same walker against the homepage route (matrix row 1, which had no covering test); adds the `src/app/**/page.test.tsx` include glob, since `[locale]` is a glob char-class and the explicit allow-list did not reach the file. Guard proven to fail (`function at labels.bottomNav.unscannedTickets`) by temporarily reinstating the bug.

**Acceptance Criteria:**

- Given the dev server is running, when `/fr`, `/fr/events` and `/fr/events/{documentId}` are loaded, then each renders without the "Functions cannot be passed directly to Client Components" error.
- Given the three locales, when a badge or price label renders, then the string comes from the existing `fr`/`ar`/`en` catalogs — no hardcoded French survives in the changed render paths.
- Given the refactor is complete, when the label interfaces are inspected, then no interface reachable from a server route declares a function-typed field.
- Given `yarn type-check` runs, then it passes — proving every cascade site was updated.

## Spec Change Log

### 2026-08-07 — review round 1 (no loopback; patches applied in place)

Three review layers (blind-hunter, edge-case-hunter, verification-gap) audited the diff. Zero `intent_gap`, zero `bad_spec` — the approach held. Seven `patch` findings applied, four deferred (DW-269 – DW-272), three rejected.

- **Judgment call recorded:** the Storybook breakage arguably qualified as `bad_spec` — this spec's own "Always" list named Storybook as a dependency, then chose an approach that broke it without requiring a provider decorator. Classified `patch` instead: the approach needed no re-derivation, only an additive `.storybook/preview.tsx` decorator. The workflow's tiebreak prefers `bad_spec`; deviating avoided reverting correct code to regenerate it identically.
- **KEEP (must survive any re-derivation):** the `useTranslations`-on-the-client approach; deleting rather than migrating the dead `ticketsAvailable` field; the generic `assertNoFunctionProps` walker. All three survived review intact.
- **Known-bad states now avoided:** (a) every Storybook story touching `BottomNav`/`EventCard` throwing "No intl context found" — including files this change never opened; (b) a whole-suite-green build in which the components bind a wrong message namespace.
- **Residual gap found and closed AFTER the patch round:** the added real-catalog test hardcoded the namespace strings, so it validated the catalog but not the component's binding to it. Demonstrated by mutation — rewriting `useTranslations("home.bottomNav")` to a nonsense namespace left all 1098 tests green. Closed by `parameterizedLabelsBinding.test.tsx`, which renders the real components inside a real `NextIntlClientProvider` with the real `fr` catalog and no next-intl mock; the same mutation now fails it.

## Design Notes

`BottomNav` currently computes `badgeLabel` for every tab even though it is only read when `showBadge` is true. Keep that shape; just swap the source:

```tsx
const t = useTranslations("home.bottomNav")
// …inside the tab map:
const badgeLabel =
  tabId === "tickets"
    ? t("unscannedTickets", { count: ticketCount })
    : t("notifications", { count: accountBadgeCount })
```

`EventDetailPage.ticketsAvailable` is dead weight — declared at :68, defaulted at :99, never called. Removing it (rather than migrating it) is the correct fix; the server was paying to build a label nothing rendered.

The serializability walker in the route test is the durable guard, so keep it generic rather than asserting on specific keys:

```ts
function assertNoFunctions(value: unknown, path = "labels") {
  if (typeof value === "function") throw new Error(`function at ${path}`)
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value))
      assertNoFunctions(v, `${path}.${k}`)
}
```

## Verification

**Commands:**

- `yarn workspace @tiween/client type-check` -- expected: clean. This is the primary proof the cascade is complete.
- `yarn workspace @tiween/client test` -- expected: all listed suites pass, including the new BottomNav badge, EventCard price and route-serializability assertions.
- `yarn workspace @tiween/client lint` -- expected: clean.

**Manual checks:**

- Load `/fr`, `/fr/events` and one `/fr/events/{documentId}` in the running dev server; the console shows no RSC serialization error and the ticket/notification badges plus the "À partir de …" price line read correctly.
- Repeat `/ar` on the homepage to confirm the RTL badge labels resolve from `ar.json` (Western numerals per project rule).

## Suggested Review Order

**The fix — parameterized lookups move to the client side of the RSC boundary**

- Entry point: the crash site. Two arrow-function labels deleted from the server bundle.
  [`page.tsx:83`](../../apps/client/src/app/[locale]/page.tsx#L83)

- The receiving end: badge labels now resolved from the catalog, not from props.
  [`BottomNav.tsx:74`](../../apps/client/src/components/layout/BottomNav/BottomNav.tsx#L74)

- Same pattern, listing card. `priceFrom` interpolates, so it cannot be a string prop.
  [`EventCard.tsx:136`](../../apps/client/src/features/events/components/EventCard/EventCard.tsx#L136)

- Same pattern, detail page; the dead `ticketsAvailable` field was deleted, not migrated.
  [`EventDetailPage.tsx:155`](../../apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx#L155)

- The other two broken routes, fixed identically at source.
  [`events/page.tsx:89`](../../apps/client/src/app/[locale]/events/page.tsx#L89)

- Detail route; note `dateRange` above it already used the correct raw-ICU pattern.
  [`[documentId]/page.tsx:168`](../../apps/client/src/app/[locale]/events/[documentId]/page.tsx#L168)

**Collateral the approach forced — Storybook lost its provider-free rendering**

- Stories now need real intl context; keyed off the existing `direction` global.
  [`preview.tsx:63`](../../apps/client/.storybook/preview.tsx#L63)

**Guards — why this bug class cannot come back silently**

- Binds component to catalog: real provider, real `fr` messages, no mock. Catches namespace drift.
  [`parameterizedLabelsBinding.test.tsx:53`](../../apps/client/src/app/[locale]/events/parameterizedLabelsBinding.test.tsx#L53)

- Shared walker: cycle-safe, walks whole props object, not just `labels`.
  [`assert-serializable-props.ts:39`](../../apps/client/test/assert-serializable-props.ts#L39)

- Real-catalog ICU check for all three keys across `fr`/`ar`/`en`.
  [`parameterizedLabelsI18n.test.tsx:52`](../../apps/client/src/app/[locale]/events/parameterizedLabelsI18n.test.tsx#L52)

- Per-route serializability guards, one per fixed route.
  [`page.test.tsx:88`](../../apps/client/src/app/[locale]/page.test.tsx#L88)

**Peripherals**

- New include glob; `[locale]` is a char-class, hence the `**`.
  [`vitest.config.ts:126`](../../apps/client/vitest.config.ts#L126)

- Type cascade: nested `bottomNav` shapes and their `defaultLabels`.
  [`HomePageWithVenue.tsx:41`](../../apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx#L41)
