---
title: "Migrate the Next.js middleware file convention to proxy"
type: "refactor"
created: "2026-08-07"
status: "done"
baseline_commit: "9dc7fc812bf5acf204d2c782130ebd086fbccee9"
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Next.js 16.1 deprecated the `middleware` file convention in favour of `proxy`, so `yarn dev:client` prints `⚠ The "middleware" file convention is deprecated` on every boot. `apps/client/src/middleware.ts` is the app's only request-interception layer — locale routing, the `/venue/*` auth gate (Story 7.3), and the ticket-purchase rewrite-to-404 gate (Story 3.12) — so the warning sits on a load-bearing file a future major will drop.

**Approach:** Rename the file to `apps/client/src/proxy.ts` and its default export to `proxy`, keeping every branch, regex and `config.matcher` pattern byte-identical. Follow the rename through the co-located test, the vitest include list, and the prose pointing at the old path.

## Boundaries & Constraints

**Always:**

- Preserve gate logic and `config.matcher` byte-for-byte: HTTPS redirect, purchase rewrite, `authPages`/`authPrefixes` regexes, fall-through to `intlMiddleware`.
- Use `git mv` for both renames so history follows.
- Keep the local names `intlMiddleware`/`authMiddleware` and the `next-intl/middleware` / `next-auth/middleware` imports — package subpaths, unrelated to the file convention.

**Ask First:**

- Any behavioural change to a gate, matcher pattern, or auth/purchase branch.
- Any breakage traced to `proxy` running on Node.js instead of the edge runtime.

**Never:**

- Do not add `runtime` or any route-segment config to the exported `config` — Next errors on it in a proxy file.
- Do not leave `middleware.ts` behind alongside the new file.
- Do not touch Strapi middlewares or `zustand/middleware` — unrelated namesakes.

## I/O & Edge-Case Matrix

| Scenario                        | Input / State                        | Expected Output / Behavior                | Error Handling             |
| ------------------------------- | ------------------------------------ | ----------------------------------------- | -------------------------- |
| Purchase gate OFF               | GET `/fr/tickets/doc-1/scr-1`        | `x-middleware-rewrite` → `/not-found-404` | N/A                        |
| Purchase gate OFF, viewing path | GET `/fr/tickets`                    | No rewrite; intl layer handles            | N/A                        |
| Purchase gate ON                | GET `/fr/tickets/doc-1/scr-1`        | No rewrite; intl layer handles            | N/A                        |
| Auth-gated subtree              | GET `/fr/venue/events/abc123`        | Routed through `authMiddleware`           | Anonymous → `/auth/signin` |
| Public lookalike prefix         | GET `/fr/venues/le-rio`              | Intl layer; never auth-gated              | N/A                        |
| Non-dev, plain HTTP             | `x-forwarded-proto` absent/non-https | 301 to the `https://` equivalent          | N/A                        |

</frozen-after-approval>

## Code Map

- `apps/client/src/middleware.ts` -- the file being renamed. Default export `middleware(req)` ~line 47; `export const config` (3 matcher patterns) at the tail. Layers in order: HTTPS redirect → purchase rewrite (`isTicketPurchaseEnabled`/`isTicketPurchasePath`) → auth (`authPages` + `authPrefixes` regexes) → `intlMiddleware`.
- `apps/client/src/middleware.flag.test.ts` -- co-located suite; imports `middleware, { config } from "./middleware"` (line 22). Four describes: purchase gating OFF/ON, matcher coverage via Next's own `path-to-regexp`, `/venue` vs `/venues` auth split. Asserts the `x-middleware-rewrite` header, which Next 16 still emits under proxy (`next/dist/server/web/spec-extension/response.js:118`) — **do not rename that assertion**.
- `apps/client/vitest.config.ts:87-90` -- explicit include entry `"src/middleware.flag.test.ts"`; the suite silently stops running if this is missed.
- `apps/client/README.md:202,319` -- prose links to `src/middleware.ts`.
- Comment-only "middleware"/"edge middleware" mentions (all under `apps/client/src`): `lib/feature-flags.ts:22`, `lib/feature-flags.test.ts:8`, `app/[locale]/venue/profile/page.tsx:37`, `app/[locale]/venue/events/page.tsx:33`, `app/[locale]/venue/events/new/page.tsx:30`, `app/[locale]/tickets/[documentId]/[screeningId]/page.tsx:32-33` and `.../purchase-pages.flag.test.tsx:6`.
- Read-only evidence: `next.config.mjs` has no middleware reference; `next/dist/lib/constants.js:274` (`PROXY_FILENAME='proxy'`, matched at `(?:src/)?proxy`); `next/dist/build/analysis/get-page-static-info.js:285-296` (default or named `proxy` export accepted), `:549-557` (route-segment config forbidden; proxy always Node.js).

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/middleware.ts` -- `git mv` to `src/proxy.ts`; rename the default export `middleware` → `proxy`; update comments that name this file -- clears the deprecation.
- [x] `apps/client/src/middleware.flag.test.ts` -- `git mv` to `src/proxy.flag.test.ts`; import `proxy, { config } from "./proxy"`, update call sites and describe wording -- keep every case and the `x-middleware-rewrite` assertions unchanged.
- [x] `apps/client/vitest.config.ts` -- update the include entry and its comment to `src/proxy.flag.test.ts` -- otherwise the gate suite stops running.
- [x] `apps/client/README.md` -- repoint both `src/middleware.ts` links to `src/proxy.ts`.
- [x] Comment-only sweep over the files listed last in the Code Map -- say "proxy", drop "edge" (it now runs on Node.js) -- no logic changes.
- [x] `apps/client/src/proxy.flag.test.ts` -- add a `HTTPS redirect (production only)` suite covering the last matrix row, which had no test: the shared `isDevelopment` mock was a pinned `true`, so the redirect branch was unreachable. Replaced with a mutable `runtimeEnv.isDev` stub, reset in `afterEach`.

**Acceptance Criteria:**

- Given a cleared `.next`, when `yarn dev:client` boots, then no `middleware-to-proxy` deprecation warning is printed and the server reports ready.
- Given the renamed suite, when `yarn test` runs, then `src/proxy.flag.test.ts` executes and every previously-passing case still passes.
- Given the repo after the change, when `apps/client/src` is searched, then no `middleware.ts`/`middleware.flag.test.ts` remains and nothing imports `./middleware`.

## Design Notes

The rename is mechanical; the runtime is not. `proxy` runs on Node.js, whereas `middleware` ran on the edge runtime. `next-intl/middleware` and `next-auth/middleware` (v4.24) are plain JS with no edge-only APIs, so no code change is expected — but a boot-time runtime error would trace here, and triggers the "Ask First" clause rather than a silent workaround.

```ts
export default function proxy(req: NextRequest) {
  // ...unchanged body...
}
export const config = {
  matcher: [
    /* unchanged */
  ],
}
```

## Verification

**Commands:**

- `yarn workspace @tiween/client test src/proxy.flag.test.ts` -- expected: suite runs (not "no test files found") and all cases pass
- `yarn type-check` -- expected: clean; catches any stale `./middleware` import
- `yarn lint` -- expected: clean
- `rm -rf apps/client/.next && yarn dev:client` -- expected: `✓ Ready` with no deprecation warning
- `git status` -- expected: both renames recorded as `R` entries, not add+delete

**Manual checks (if no CLI):**

- Hit `/fr/venue/profile` anonymously on the dev server -- expected: redirect to `/auth/signin`, confirming the auth gate still fires through the proxy.

**Verification results (2026-08-08):**

- `proxy.flag.test.ts`: 41 passed. Full client suite: 1107 passed / 106 files. Lint clean, Prettier clean. `tsc --noEmit`: 63 errors, byte-identical to the `baseline_commit` count and none naming `proxy` -- all pre-existing (see DW-274).
- Dev server on a scratch port: `✓ Ready in 839ms`, no `middleware-to-proxy` warning. Next's own request log confirms the convention mounted: `GET /fr/tickets/doc-1/scr-1 404 in 2.3s (compile: 2.1s, proxy.ts: 1710µs, ...)`.
- Live gate checks against the real (unmocked) `withAuth` and next-intl middleware under the Node runtime -- the one thing the rename actually changes: `/fr/venue/profile` → `307 → /auth/signin?callbackUrl=%2Ffr%2Fvenue%2Fprofile`; `/fr/tickets/doc-1/scr-1` → `404`; `/fr/venues/register` → `307 → /venues/register` (locale normalization, not auth-gated).
- Mutation check on the new mount assertion: recreating `src/middleware.ts` fails it with `expected [ 'src/middleware.ts', 'src/proxy.ts' ] to deeply equal [ 'src/proxy.ts' ]`.

## Suggested Review Order

**The rename itself**

- The whole point: default export renamed, plus what the convention change actually costs.
  [`proxy.ts:56`](../../apps/client/src/proxy.ts#L56)

- Matcher preserved byte-for-byte — this is what decides whether the gates run at all.
  [`proxy.ts:109`](../../apps/client/src/proxy.ts#L109)

- Gate bodies unchanged; confirm the purchase and auth branches are untouched.
  [`proxy.ts:78`](../../apps/client/src/proxy.ts#L78)

**New coverage this change adds**

- Guards the rename's real failure mode: a misplaced or resurrected interceptor file.
  [`proxy.flag.test.ts:223`](../../apps/client/src/proxy.flag.test.ts#L223)

- Closes the matrix row that had no test — the mock previously pinned this branch off.
  [`proxy.flag.test.ts:179`](../../apps/client/src/proxy.flag.test.ts#L179)

- Single request builder, always setting `host`, so redirect assertions cannot resolve to "null".
  [`proxy.flag.test.ts:67`](../../apps/client/src/proxy.flag.test.ts#L67)

- Breadcrumb: this Next-internal header did NOT follow the rename.
  [`proxy.flag.test.ts:79`](../../apps/client/src/proxy.flag.test.ts#L79)

**Peripherals**

- Registers the renamed suite; missing this would silently unrun every gate test.
  [`vitest.config.ts:92`](../../apps/client/vitest.config.ts#L92)

- Docs repointed at the new path.
  [`README.md:202`](../../apps/client/README.md#L202)
