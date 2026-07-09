---
title: "Share Event Details (Story 3.10)"
type: "feature"
created: "2026-07-09"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: "c1f364f9c2a3190e27c56861c542ed0710732357"
final_revision: "6cd1077f2963d12064eb44f145771ca45f72b97a"
sprint_key: "3-10-share-event-details"
depends_on:
  ["3-7-event-detail-page", "3-1-public-events-browse-api-and-data-foundation"]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-7-event-detail-page.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The event detail page already has a share button (in `FilmHero`) wired to an `onShare` handler, but that handler only calls the Web Share API and silently no-ops when it's unavailable (desktop browsers) — the AC "if Web Share API is not available, copy-to-clipboard fallback is shown" and "sharing to WhatsApp/Facebook/Twitter works correctly" are unmet, there is no user feedback on copy, and the Open Graph/Twitter image URL emitted by `generateMetadata` is the raw Strapi `.url` (relative `/uploads/...` for locally-hosted assets), so the shared-preview image AC is not robust.

**Approach (fix-and-wire — do NOT rebuild):** Keep `FilmHero`'s single share button as the trigger. Extract pure, unit-tested URL builders (`buildEventShareUrl`, `buildSocialShareLinks`) into a new `utils/share.ts`. Enhance `EventDetailPage.handleShare`: try Web Share when supported (native sheet covers WhatsApp/Facebook/Twitter on mobile); otherwise open a new controlled `ShareDialog` fallback offering copy-to-clipboard (with a "Link copied" toast) plus explicit WhatsApp/Facebook/Twitter deep-links. Harden `generateMetadata` so the OG/Twitter image is always an absolute URL. Localize all new strings (fr/en/ar parity).

## Boundaries & Constraints

**Always:**

- Keep exactly one share affordance: `FilmHero`'s existing Share2 button (`onShare` callback). Do not add a second visible share trigger (the 3.8 review rejected duplicate affordances). The fallback UI is a modal opened programmatically from `EventDetailPage`, not a second button in the hero.
- The shared URL is the event's canonical absolute URL `${BASE_URL}/${locale}/events/${documentId}` (same shape as `generateMetadata`'s `canonical`), built by the pure `buildEventShareUrl`. `BASE_URL` client-side = `process.env.NEXT_PUBLIC_SITE_URL || "https://tiween.tn"` (the NEXT_PUBLIC var is inlined at build, available in the browser). Do not share `window.location.href` (avoids leaking filter/query params).
- `buildEventShareUrl` and `buildSocialShareLinks` are pure and unit-tested; exported via `utils/index.ts`. Social deep-links open in a new tab (`target="_blank" rel="noopener noreferrer"`), URL-encode their parameters, and use: WhatsApp `https://wa.me/?text=<title url>`, Facebook `https://www.facebook.com/sharer/sharer.php?u=<url>`, Twitter/X `https://twitter.com/intent/tweet?text=<title>&url=<url>`.
- Web Share path: guard on `typeof navigator !== "undefined" && navigator.share`; on `navigator.share(...)` rejection, ignore `AbortError` (user cancelled) and open the `ShareDialog` fallback for any other error. When Web Share is unsupported, tapping share opens the fallback directly. Detect support via state set in a mount effect (default unsupported on first render) to avoid hydration mismatch.
- Copy action uses `navigator.clipboard.writeText(shareUrl)` then a success toast (`toast({ title: labels.linkCopied })` from `@/components/ui/use-toast`, already globally mounted); a clipboard failure surfaces a `variant: "destructive"` toast and never throws.
- Reuse existing primitives: shadcn `Dialog` (`@/components/ui/dialog`), `Button`, lucide icons (`Share2`, `Copy`), the `toast` helper. `ShareDialog` is a controlled component (`open`/`onOpenChange`) taking `url`, `title`, and a `labels` object.
- i18n (project rule — no hardcoded strings in rendered output): add `events.*` keys at fr/en/ar parity — `copyLink`, `linkCopied`, `shareVia`, `shareOnWhatsapp`, `shareOnFacebook`, `shareOnTwitter` (reuse the existing `events.share`). The detail route's `getTranslations("events")` bundle passes them into `EventDetailPage` → `ShareDialog`. Arabic uses Western numerals; RTL inherited from the layout.
- OG/Twitter image must be absolute: in `generateMetadata`, resolve `posterUrl` to an absolute URL using the existing guard pattern (`url.startsWith("http") ? url : ${BASE_URL}${formatStrapiMediaUrl(url)}`, mirroring `lib/seo/structured-data.ts`) before assigning to `openGraph.images[].url` and `twitter.images`.

**Block If:** (none expected — the share button, OG tags, toast, dialog primitive, and i18n bundle all already exist; this is an additive fix-and-wire. Escalate rather than guess only if the design-system `Dialog` primitive cannot be composed here without a new dependency.)

**Never:**

- No new share route/page, no server-side share endpoint, no share-count/analytics, no backend or schema change, no seed change.
- Do not wire the legacy `EventDetailPageDesktop`/`EventDetailPageWithMap` variants (they read the removed `event.creativeWork`; already deferred). Do not touch browse/search/filters/map.
- Do not add native share-target/PWA manifest share handling (out of scope). No third-party share SDK (react-share etc.) — hand-rolled deep-links only.
- Do not build a slug; sharing is keyed on `documentId` (no `slug` field exists on the event).

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                       | Expected Output / Behavior                                                                         | Error Handling                                   |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Web Share supported, tap     | `navigator.share` present           | Native share sheet opens with `{ title, text: synopsis snippet, url: canonical }`                  | Ignore `AbortError`; other error → open fallback |
| Web Share unsupported, tap   | no `navigator.share`                | `ShareDialog` fallback opens (Copy link + WhatsApp/Facebook/Twitter)                               | No throw                                         |
| Tap "Copy link"              | click in fallback                   | `clipboard.writeText(canonical URL)`; success toast `linkCopied`                                   | Clipboard failure → destructive toast, no throw  |
| Tap a social link            | click WhatsApp / Facebook / Twitter | Correct share deep-link (encoded url+title) opens in a new tab (`rel="noopener noreferrer"`)       | No error                                         |
| Route metadata (SSR/crawler) | `generateMetadata` render           | `openGraph` + `twitter` carry the event title and an **absolute** poster image URL + canonical URL | Absolute even for local `/uploads/...` assets    |
| Missing poster               | event has no poster/image           | OG/Twitter emit no image (title/url only); no crash                                                | Graceful (existing `undefined` guard preserved)  |
| RTL locale `ar`              | fallback dialog on `ar`             | Localized labels, `dir="rtl"` inherited, Western numerals                                          | No error                                         |

</intent-contract>

## Code Map

- `apps/client/src/features/events/utils/share.ts` (new) — pure `buildEventShareUrl({ baseUrl, locale, documentId })` (strips trailing slash on `baseUrl`) and `buildSocialShareLinks({ url, title })` → `{ whatsapp, facebook, twitter }`. Export both (+ their option types) from `utils/index.ts`.
- `apps/client/src/features/events/utils/share.test.ts` (new) — cover URL composition, encoding of title/url, trailing-slash handling, all three social links. Auto-matched by the vitest `include` glob `src/features/events/utils/**/*.test.ts` (no config change).
- `apps/client/src/features/events/components/ShareDialog/ShareDialog.tsx` (new, `"use client"`) — controlled fallback modal (`open`, `onOpenChange`, `url`, `title`, `labels`). Renders Copy-link button (clipboard + toast) and the three social deep-links. Barrel `ShareDialog/index.ts`.
- `apps/client/src/features/events/components/ShareDialog/ShareDialog.test.tsx` (new) — jsdom render: fallback shows copy + 3 social links with correct `href`s; clicking Copy calls `clipboard.writeText` and fires a toast. Requires a vitest `include` entry (below).
- `apps/client/vitest.config.ts` — add `"src/features/events/components/ShareDialog/**/*.test.tsx"` to `test.include` (component dirs are allow-listed individually; new dirs are not matched otherwise).
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` — replace the minimal `handleShare` with: build `shareUrl` via `buildEventShareUrl`; detect Web Share support in a mount effect; on share, native-share when supported (else/on-non-abort-error open fallback); render `<ShareDialog open onOpenChange url title labels />`. Extend `EventDetailPageLabels` with the new share keys and thread them to `ShareDialog`. Keep `FilmHero`'s `onShare={handleShare}` as the sole trigger.
- `apps/client/src/features/events/components/index.ts` — export `ShareDialog` + its prop/label types.
- `apps/client/src/app/[locale]/events/[documentId]/page.tsx` — (a) add the new `events.*` share keys to the `getTranslations("events")` labels bundle passed to `<EventDetailPage>`; (b) make the OG/Twitter `posterUrl` absolute (guard + `formatStrapiMediaUrl` + `BASE_URL`).
- `apps/client/locales/{fr,en,ar}.json` — add `events.copyLink`, `events.linkCopied`, `events.shareVia`, `events.shareOnWhatsapp`, `events.shareOnFacebook`, `events.shareOnTwitter` at parity.
- `apps/client/src/lib/strapi-helpers.ts` — reference only (existing `formatStrapiMediaUrl` reused for the absolute-OG fix; no change expected).

## Tasks & Acceptance

**Execution:**

- [x] `features/events/utils/share.ts` (+ `utils/index.ts`) — add pure `buildEventShareUrl` and `buildSocialShareLinks`, exported.
- [x] `features/events/utils/share.test.ts` — unit-test URL composition, encoding, trailing-slash, and the three social links.
- [x] `features/events/components/ShareDialog/ShareDialog.tsx` (+ `index.ts`) — controlled fallback modal: copy-to-clipboard (+ toast) and WhatsApp/Facebook/Twitter deep-links, using shadcn `Dialog`/`Button` + lucide + `buildSocialShareLinks`.
- [x] `features/events/components/index.ts` — export `ShareDialog` and its types.
- [x] `features/events/components/EventDetailPage/EventDetailPage.tsx` — enhance share flow (native → fallback), build canonical `shareUrl`, render `ShareDialog`, extend `EventDetailPageLabels`; keep the single `FilmHero` trigger.
- [x] `app/[locale]/events/[documentId]/page.tsx` — thread the new share labels into the bundle; make OG/Twitter image URL absolute.
- [x] `locales/{fr,en,ar}.json` — add the six new `events.*` share keys at fr/en/ar parity.
- [x] `features/events/components/ShareDialog/ShareDialog.test.tsx` + `vitest.config.ts` — render test for the fallback (copy + social `href`s + toast) and register its path in the vitest `include` allowlist.

**Acceptance Criteria:**

- Given a published event detail page in a Web-Share-capable browser, when the user taps the share button, then the native share sheet opens carrying the event's canonical absolute URL (and title/synopsis), enabling share to WhatsApp/Facebook/Twitter via the OS.
- Given a browser without the Web Share API, when the user taps share, then a copy-to-clipboard fallback is shown with explicit WhatsApp/Facebook/Twitter options; tapping Copy copies the canonical event URL and confirms with a "Link copied" toast; each social option opens the correct share deep-link in a new tab.
- Given the route is server-rendered/crawled, when metadata is produced, then Open Graph and Twitter tags include the event title and an absolute image URL (absolute even when the poster is a local `/uploads/...` asset), so a shared link previews with image and title.
- Given the `ar`/`en` locales, when the fallback share UI renders, then all its labels are localized (no hardcoded French in the rendered output) and RTL is respected on `ar`.

## Spec Change Log

(none — no bad_spec loopback)

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 1, low 5)
- defer: 1
- reject: 8
- addressed_findings:
  - `[medium]` `[patch]` **Clipboard-failure toast reused the success label — it read "Link copied" while styled as an error, so a failed copy told the user it succeeded (and the test pinned this).** Added an `events.copyFailed` key at fr/en/ar parity, threaded it through `ShareDialogLabels`/`EventDetailPageLabels`/the route bundle, used it in `ShareDialog.handleCopy`'s catch, and corrected the destructive-toast test assertion.
  - `[low]` `[patch]` **Social-share anchors had no keyboard focus-visible ring and hand-duplicated the Button styling.** Re-rendered the three WhatsApp/Facebook/Twitter links via `<Button asChild variant="outline">` wrapping the `<a>`, inheriting the design-system focus/hover/height styles (href/target/rel/labels preserved; role="link" tests still pass).
  - `[low]` `[patch]` **Radix `DialogContent` emitted a "Missing Description" a11y warning at runtime.** Added an explicit `aria-describedby={undefined}` opt-out (the `DialogTitle` "Share via" is announced).
  - `[low]` `[patch]` **`isWebShareSupported` state/effect was unused in render and introduced a theoretical mount-race wrong-path (fallback opening on a share-capable browser).** Removed the state + effect; `handleShare` now checks `navigator.share` live at click time and delegates the error branch to the new pure `shouldFallbackAfterShareError`.
  - `[low]` `[patch]` **The absolute-OG-image logic (primary deliverable) was untested and could produce a malformed URL for non-`http`/non-`/uploads` poster values.** Extracted a pure `toAbsoluteMediaUrl({ url, baseUrl })` (http passthrough, protocol-relative → `https:`, single-slash join) into `utils/share.ts`, narrowed `formatStrapiMediaUrl`'s `string|StaticImport|undefined` return via a `typeof === "string"` guard in `page.tsx`, and added 6 unit tests.
  - `[low]` `[patch]` **The native-share AbortError discrimination was untested.** Extracted the decision into pure `shouldFallbackAfterShareError(error)` (AbortError ⇒ no fallback; any other ⇒ fallback) with 3 unit tests.
  - Deferred (1): a full `EventDetailPage` jsdom render test covering the native-vs-fallback wiring, the `shareUrl` call-site (canonical URL, not `window.location.href`), and end-to-end label threading — needs the component dir added to the vitest `include` allowlist. Appended to `deferred-work.md`.
  - Rejected (8): base-URL fallback literal duplicated across `page.tsx`/`EventDetailPage.tsx` (both read the same env var + fallback; matches the existing codebase pattern); `encodeURIComponent` on `locale`/`documentId` in `buildEventShareUrl` (Strapi v5 documentIds are alphanumeric; social links encode the whole URL anyway); `formatStrapiMediaUrl` type smell (addressed incidentally by the Patch-5 `typeof` narrow); treating `NotAllowedError` as a cancel (current "open fallback on any non-abort error" is the safer default — a rare double-prompt beats no fallback); `synopsis.slice`/`title`/`documentId` undefined guards (all typed non-nullable `string` by the mapper); per-platform share-payload variance (title+url is the common denominator, native adds a synopsis snippet by design); `twitter.com/intent/tweet` vs `x.com` (301 redirect works; the label says "Twitter").

## Design Notes

**Single trigger, programmatic fallback.** `FilmHero` already renders the only share button and fires `onShare`. Rather than add a second button, `EventDetailPage` owns the logic: Web Share when supported, else a controlled `ShareDialog`. This keeps the "one-tap" hero affordance and avoids the duplicate-affordance problem the 3.8 review flagged.

**Why pure URL builders.** The canonical URL and social deep-links are needed in both the native-share call and the fallback links, and are the only cleanly unit-testable core of this feature (the native sheet and clipboard can't be exercised unattended). Example:

```ts
buildEventShareUrl({
  baseUrl: "https://tiween.tn",
  locale: "fr",
  documentId: "abc",
})
// "https://tiween.tn/fr/events/abc"
buildSocialShareLinks({ url, title: "Barbie" }).whatsapp
// "https://wa.me/?text=Barbie%20https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
```

**Absolute OG image.** `generateMetadata` currently feeds the raw Strapi `.url` into `openGraph.images`; S3 assets are absolute but local `/uploads/...` are not, and this route doesn't set its own `metadataBase`. Making the URL explicitly absolute (reusing `formatStrapiMediaUrl` + `BASE_URL`, as `lib/seo/structured-data.ts` already does) guarantees the preview image resolves for crawlers regardless of asset host.

**Live Web Share detection (no state).** The share button markup is unconditional (rendered by `FilmHero`), so nothing in render depends on Web Share support — `handleShare` checks `navigator.share` live at click time (client-only, always defined by then). This avoids both a hydration mismatch and the mount-race where a support flag is still `false` when the user clicks. On a native-share rejection, `shouldFallbackAfterShareError` opens the fallback for every error except a user-cancel (`AbortError`).

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `share` util tests and the `ShareDialog` render test (confirm the new `include` glob matches).
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in changed files (known pre-existing baseline only).
- `yarn workspace @tiween/client lint` — expected: exit 0 (pre-existing warning baseline unchanged).
- `yarn workspace @tiween/client build` — expected: the `/[locale]/events/[documentId]` route compiles with the new client component and metadata changes.

**Manual checks (if no CLI):**

- On a mobile browser open `/fr/events/<documentId>` and tap share → native sheet lists WhatsApp/Facebook/Twitter with the canonical URL. On desktop Chrome, tapping share opens the fallback dialog; Copy shows a "Link copied" toast; each social link opens the correct target in a new tab. Repeat on `/ar/...` for localized labels + RTL. Inspect page source `<meta property="og:image">` / `twitter:image` → absolute URL.

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.10 (Share Event Details) as a **fix-and-wire** enhancement of the existing event-detail share button. Before this story, `FilmHero`'s share button fired an `onShare` handler that only called the Web Share API and silently no-oped where it's unavailable (desktop) — the copy-to-clipboard fallback, WhatsApp/Facebook/Twitter sharing, and user feedback ACs were unmet, and `generateMetadata`'s Open Graph/Twitter image was the raw Strapi `.url` (relative for local `/uploads/...` assets). **Frontend:** added pure, unit-tested URL builders (`buildEventShareUrl`, `buildSocialShareLinks`, plus `toAbsoluteMediaUrl` and `shouldFallbackAfterShareError` after review); kept `FilmHero`'s single share button as the sole trigger; `EventDetailPage.handleShare` now uses native Web Share when supported (its sheet covers WhatsApp/Facebook/Twitter on mobile) and otherwise opens a new controlled `ShareDialog` fallback offering copy-to-clipboard (with a localized success/failure toast) and explicit WhatsApp/Facebook/Twitter deep-links; the shared URL is the event's canonical absolute URL (not `window.location.href`). Hardened `generateMetadata` so the OG/Twitter image is always absolute. Localized all new strings at fr/en/ar parity. No backend, schema, seed, or route change; no second share affordance; no third-party share SDK.

**Files changed.**

- [apps/client/.../utils/share.ts](../../apps/client/src/features/events/utils/share.ts) (new) + [share.test.ts](../../apps/client/src/features/events/utils/share.test.ts) (new, 16 tests) — pure `buildEventShareUrl`, `buildSocialShareLinks`, `toAbsoluteMediaUrl`, `shouldFallbackAfterShareError`.
- [apps/client/.../utils/index.ts](../../apps/client/src/features/events/utils/index.ts) — export the new helpers + types.
- [apps/client/.../components/ShareDialog/ShareDialog.tsx](../../apps/client/src/features/events/components/ShareDialog/ShareDialog.tsx) (new) + [index.ts](../../apps/client/src/features/events/components/ShareDialog/index.ts) (new) + [ShareDialog.test.tsx](../../apps/client/src/features/events/components/ShareDialog/ShareDialog.test.tsx) (new, 3 tests) — controlled copy + social-deep-link fallback modal (shadcn Dialog/Button asChild, lucide, localized labels, clipboard success/failure toast).
- [apps/client/.../components/index.ts](../../apps/client/src/features/events/components/index.ts) — export `ShareDialog` + types.
- [apps/client/.../components/EventDetailPage/EventDetailPage.tsx](../../apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx) — canonical `shareUrl`; native-share-then-fallback `handleShare` (live `navigator.share` check, `shouldFallbackAfterShareError`); render `ShareDialog`; `EventDetailPageLabels` extended (7 keys).
- [apps/client/.../events/[documentId]/page.tsx](../../apps/client/src/app/[locale]/events/[documentId]/page.tsx) — thread the new share labels; make OG/Twitter image absolute via `formatStrapiMediaUrl` + `toAbsoluteMediaUrl`.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — 7 new `events.*` share keys (`copyLink`, `linkCopied`, `copyFailed`, `shareVia`, `shareOnWhatsapp`, `shareOnFacebook`, `shareOnTwitter`) at parity.
- [apps/client/vitest.config.ts](../../apps/client/vitest.config.ts) — allowlist `ShareDialog/**/*.test.tsx`.

**Review findings breakdown.** 6 patches applied (1 medium: clipboard-failure toast no longer mislabels a failed copy as "Link copied" — new `copyFailed` key; 5 low: social anchors via `<Button asChild>` for focus/consistency, silenced the Radix DialogContent a11y warning, simplified `handleShare` to a live check removing an unused state/effect + mount-race, extracted+tested `toAbsoluteMediaUrl` for the OG image, extracted+tested `shouldFallbackAfterShareError`). 1 deferred (a full `EventDetailPage` jsdom render test for the native-vs-fallback wiring + label threading → needs the component dir added to vitest `include`; logged to `deferred-work.md`). 8 rejected (base-URL literal duplication; encode alphanumeric documentId/locale; helper type smell (already addressed); NotAllowedError-as-cancel; typed-non-null undefined guards; per-platform payload variance; twitter.com→x.com). No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0). `followup_review_recommended: false` — the fixes are localized and each covered by new/updated unit tests; the one genuinely untested surface (EventDetailPage component wiring) was deferred, not risk-changed.

**Verification performed (re-run post-patch).**

- `yarn workspace @tiween/client test --run` → PASS **184/184** (11 files). `share.test.ts` 16, `ShareDialog.test.tsx` 3; the updated destructive-toast assertion (`copyFailed`) passes; the new `ShareDialog` include glob matches.
- `yarn workspace @tiween/client typecheck` → **73** errors = the exact pre-existing baseline (**0 net-new**); the changed files (`share.ts`, `ShareDialog.tsx`, `EventDetailPage.tsx`, `page.tsx`) are clean. Residual `page.tsx` `<JsonLd>`/`EventSchema` mismatch (pre-existing, line-shifted by added labels) and `EventDetailPageWithMap.tsx` (legacy, unrouted, untouched) are baseline.
- `yarn workspace @tiween/client lint` → **0 errors** (279 warnings, pre-existing baseline).

**Residual risks.**

- Not exercised against a live browser or a booted Strapi + seed (not available here). The native Web Share sheet, the OS clipboard, the on-page `ShareDialog` rendering inside `EventDetailPage`, and the actual crawler resolution of the absolutized OG image were not visually verified; the pure helpers and the isolated `ShareDialog` are covered by unit tests, but the `EventDetailPage` integration (which URL/label/flag reaches `navigator.share` and `ShareDialog`) is untested (deferred). Recommend `yarn seed:fresh && yarn dev`, then a mobile pass (native sheet + canonical URL) and a desktop pass (fallback dialog: Copy → toast, social links open correctly) on `/fr/events/<id>` and `/ar/events/<id>`, plus an OG-tag inspection, when an instance is available.
- The OG image absolute URL for local uploads points at the site's `/api/asset/...` proxy; it resolves only when that route handler is deployed and public.
