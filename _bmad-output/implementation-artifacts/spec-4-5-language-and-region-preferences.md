---
title: "Language and Region Preferences"
type: "feature"
created: "2026-07-09"
status: "done"
baseline_revision: "c8e78d4fa730cc1b9d8cb55fdf3f9d6fa3564604"
final_revision: "228d4c53e597e3f99b0096de1f50497438df8252"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Story 4.4 already ships a profile form that _saves_ `preferredLanguage`/`defaultRegion` to the user, but the preferences do not actually drive the experience: (1) `useCurrentUser` populates only `avatar`, so a saved region never reads back and the region select renders blank on reload — and `defaultRegion` is a Strapi relation while `UserProfile.defaultRegion` is typed `string`, so even if populated it would leak a raw relation object; (2) a returning user's stored language is never applied — locale is driven only by the URL/`NEXT_LOCALE` cookie, so on a fresh device/session the app ignores their profile language; (3) nothing makes event listings default to the user's `defaultRegion`. Story 4.5 must make both preferences persist across sessions and shape the app: language applied on login and settable immediately, region defaulting the events listing.

**Approach:** Three thin seams over existing infrastructure. (A) `useCurrentUser` populates `defaultRegion` and normalizes the relation to its `documentId` string (pure helper `extractRegionDocumentId`), so the profile select pre-fills and other components can read it. (B) The NextAuth `session` callback (which already re-fetches `/users/me`) also exposes `preferredLanguage` on `session.user`; a new client `PreferenceSync` component applies it once per authenticated mount via the next-intl navigation router (`router.replace(pathname, { locale })` — immediate + cookie-persistent), matching the existing `LocaleSwitcher` idiom. (C) `EventLocationFilter` gains an optional `defaultRegion` prop that seeds the location filter as the lowest-precedence fallback (URL > localStorage > profile `defaultRegion`), reusing its existing reconcile-against-available-regions restore-on-mount; `EventsListing` supplies it from `useCurrentUser`.

## Boundaries & Constraints

**Always:**

- Locale switching uses the next-intl navigation router from `@/lib/navigation` (`router.replace(pathname, { locale })`), never a hard reload — this both changes the active locale immediately and persists the `NEXT_LOCALE` cookie. Preserve the existing ProfileForm post-save language re-route.
- The region identifier is the Strapi `documentId` EVERYWHERE it already is (profile select value, events `region` URL param, `EventLocationFilter` reconciliation). `useCurrentUser` MUST normalize `defaultRegion` (a `manyToOne` relation) to its `documentId` string or `undefined` — never surface the raw relation object into `UserProfile.defaultRegion` (kept typed `string`).
- Events location-filter precedence is URL > device `localStorage` > profile `defaultRegion`. The `defaultRegion` fallback MUST be reconciled against the regions actually available for the locale (dropped if absent, exactly as the saved-location restore does), MUST NOT fire when a URL or localStorage location already exists, and MUST NOT fire when geography is empty (the control renders nothing).
- `PreferenceSync` applies the stored language AT MOST ONCE per authenticated mount (ref-guarded by user id) and only when `session.user.preferredLanguage` is set AND differs from the active locale; it must not re-force the locale on every subsequent navigation (a logged-in user can still browse another locale within a session) and must not loop.
- Reuse the `/users/me` re-fetch already in the `session` callback to read `preferredLanguage` — do not add a second fetch; expose only `preferredLanguage` on `session.user` (no JWT-bloating fields).
- Reuse existing pieces: `LocaleSwitcher`'s `router.replace(path, { locale })` idiom, `EventLocationFilter`'s `readSavedLocation`/reconcile/`restoredRef` pattern, the `useCurrentUser` react-query hook + `["user","me"]` key, `getRegions`→`documentId` mapping, and the vitest `EventLocationFilter.test.tsx` / `ProfileForm.test.tsx` harness patterns.

**Block If:**

- Making listings default to the region would require changing the events RSC server fetch or the meaning of the `region` URL param, rather than seeding the initial URL client-side via the existing restore-on-mount.
- Applying the stored language cannot be done through the next-intl navigation router (e.g. it would require a full-page reload or a server action that breaks SSR/hydration).

**Never:**

- Do not auto-adopt a device locale/region onto the profile at login. The schema default `preferredLanguage: "fr"` makes an unset preference indistinguishable from an explicit "fr", so a silent write could clobber a real choice — record as deferred. The only profile write path for preferences stays the profile form's explicit save.
- Do not modify the register / social-callback / forgot / reset / change-email wraps or the `jwt.verify` session-invalidation wrap; do not write `passwordChangedAt`. Do not change 4.4's display-name/`username`, avatar, or email-change behavior.
- Do not hardcode user-facing strings or add new copy (reuse existing `profile.*` and event-filter labels); do not add Arabic-Indic numerals.

## I/O & Edge-Case Matrix

| Scenario                                    | Input / State                                                            | Expected Output / Behavior                                                              | Error Handling    |
| ------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------- |
| Read back saved region                      | `GET /users/me`, `defaultRegion` relation set                            | `UserProfile.defaultRegion === region.documentId`; profile region select pre-selects it | No error expected |
| Read back — no region                       | `defaultRegion` null/absent                                              | `UserProfile.defaultRegion === undefined`; select shows placeholder                     | No error expected |
| Returning user — stored language differs    | authenticated, `session.user.preferredLanguage="ar"`, active locale `fr` | `PreferenceSync` switches to `ar` once via `router.replace(pathname,{locale:"ar"})`     | No error expected |
| Stored language equals active locale        | `preferredLanguage="fr"`, locale `fr`                                    | no switch                                                                               | No error expected |
| Unauthenticated / no preference             | no session, or `preferredLanguage` unset                                 | `PreferenceSync` no-op                                                                  | No error expected |
| Events visit — profile region seeds listing | `/events`, no URL/localStorage location, `defaultRegion` doc exists      | filter seeds `region=<documentId>` via `onChange(...,{replace:true})`; list filtered    | No error expected |
| Events visit — URL already has a location   | `/events?region=docX`                                                    | `defaultRegion` ignored (URL wins)                                                      | No error expected |
| Events visit — localStorage has a location  | saved location present                                                   | localStorage wins over `defaultRegion`                                                  | No error expected |
| Events visit — stale profile region         | `defaultRegion` not among current regions                                | dropped; no seed                                                                        | No error expected |
| Events visit — nothing anywhere             | anonymous, no saved location, `defaultRegion` unset                      | no seed                                                                                 | No error expected |

</intent-contract>

## Code Map

- `apps/client/src/hooks/useUser.ts` -- `useCurrentUser`: add `defaultRegion` to `populate`; map the response through a pure `extractRegionDocumentId(defaultRegion)` helper so `UserProfile.defaultRegion` is the region `documentId` string or `undefined`. Type stays `string`. Export the helper for unit testing.
- `apps/client/src/lib/auth.ts` -- `session` callback: after the existing `/users/me` re-fetch, set `token.preferredLanguage = fetchedUser.preferredLanguage` and expose `session.user.preferredLanguage = token.preferredLanguage`. No new fetch; no other token fields.
- `apps/client/src/types/next-auth.d.ts` -- add `preferredLanguage?: "ar" | "fr" | "en"` to `AppUser` and to the `JWT` interface.
- `apps/client/src/components/providers/PreferenceSync.tsx` (NEW) -- client component: reads `useSession()`, `useLocale()`, and next-intl `useRouter`/`usePathname` from `@/lib/navigation`; on authenticated status, if `session.user.preferredLanguage` is set and `!== locale`, calls `router.replace(pathname, { locale })` exactly once (ref-guarded by `session.user.userId`). Renders nothing.
- `apps/client/src/app/[locale]/layout.tsx` -- render `<PreferenceSync />` inside `ClientProviders` (under `SessionProvider` + the next-intl provider) so it has session + locale + navigation.
- `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx` -- add optional `defaultRegion?: string` prop; in the restore-on-mount effect, when there is no URL location and `readSavedLocation()` returns null, fall back to `{ region: defaultRegion }` reconciled against `regions` (same drop-if-stale guard); keep all existing guards (skip if URL location, skip if `regions.length === 0`, `restoredRef`). Do NOT persist the fallback to localStorage (it is a profile default, not a device choice).
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` -- call `useCurrentUser()` (client hook) and pass `data?.defaultRegion` as the new `defaultRegion` prop to `EventLocationFilter`.
- `apps/client/src/hooks/useUser.test.ts` (NEW) -- unit-test `extractRegionDocumentId`: relation object → its `documentId`; `null`/`undefined`/missing → `undefined`; a plain string passes through.
- `apps/client/src/components/providers/PreferenceSync.test.tsx` (NEW) + `apps/client/vitest.config.ts` include glob -- vitest: authenticated + differing `preferredLanguage` → `router.replace` called with the stored locale once; equal locale → no call; unauthenticated / unset → no call; second render does not re-switch.
- `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.test.tsx` -- add cases: seeds from `defaultRegion` when no URL/localStorage location; URL and localStorage each take precedence over `defaultRegion`; stale `defaultRegion` (absent from `regions`) is dropped with no seed; `defaultRegion` is NOT written to localStorage.
- `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.test.tsx` -- add a case: a profile whose `defaultRegion` is a region `documentId` pre-selects that region option; assert the save payload still carries `preferredLanguage`/`defaultRegion`.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/hooks/useUser.ts` -- add exported `extractRegionDocumentId`; add `defaultRegion` to `useCurrentUser` populate and normalize the response so `UserProfile.defaultRegion` is the `documentId` string (or `undefined`).
- [x] `apps/client/src/lib/auth.ts` -- expose `preferredLanguage` from the existing `/users/me` re-fetch onto `token` and `session.user`.
- [x] `apps/client/src/types/next-auth.d.ts` -- add `preferredLanguage` to `AppUser` and `JWT`.
- [x] `apps/client/src/components/providers/PreferenceSync.tsx` (NEW) -- once-per-mount locale application from the session preference via the next-intl router; render it in `apps/client/src/app/[locale]/layout.tsx` inside `ClientProviders`.
- [x] `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx` -- add `defaultRegion?` prop and use it as the lowest-precedence, reconciled restore-on-mount fallback (not persisted to localStorage), preserving every existing guard.
- [x] `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` -- thread `useCurrentUser().data?.defaultRegion` into `EventLocationFilter`.
- [x] `apps/client/src/hooks/useUser.test.ts` (NEW) -- unit-test `extractRegionDocumentId` (relation → documentId, null/undefined → undefined, string passthrough).
- [x] `apps/client/src/components/providers/PreferenceSync.test.tsx` (NEW) + `apps/client/vitest.config.ts` -- add the include glob; test switch-once / no-switch-when-equal / no-op-unauthenticated / no-double-switch.
- [x] `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.test.tsx` -- add the `defaultRegion` precedence + stale-drop + no-localStorage-write cases.
- [x] `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.test.tsx` -- add the region read-back pre-fill case.

**Acceptance Criteria:**

- Given a logged-in user who previously saved a `defaultRegion`, when they open `auth/profile`, then the region select is pre-selected to that region (read back as its `documentId`), and saving still persists `preferredLanguage`/`defaultRegion` via `PUT /users/me`.
- Given a logged-in user whose profile `preferredLanguage` differs from the URL locale, when the authenticated app first loads, then the app switches to their preferred locale once (URL + `NEXT_LOCALE` cookie), and they can still navigate to another locale afterwards within that session without being forced back until the next load.
- Given a logged-in user with a `defaultRegion` who opens `/events` with no region in the URL and no remembered device location, then the events location filter defaults to that region and the listing is filtered to it; a region present in the URL or in `localStorage` overrides the profile default, and a stale profile region (absent for the locale) is dropped.
- Given an unauthenticated visitor or a user with no `preferredLanguage`/`defaultRegion`, when they use the app, then no locale switch and no region seeding occur (behavior is unchanged from before this story).

## Spec Change Log

_No `bad_spec` loopback occurred. The review confirmed the captured intent and approach were sound; all findings were code-level patches or deferrals._

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 1, medium 2, low 4)
- defer: 4
- reject: 6
- addressed_findings:
  - `[high]` `[patch]` The profile `defaultRegion` seed was effectively DEAD on a fresh `/events` load: `EventLocationFilter`'s restore effect burned its one-shot `restoredRef` on the first commit, but `defaultRegion` is fed from react-query (`useCurrentUser` in `EventsListing`) and is `undefined` on that commit — so the seed branch ran with no value, the guard locked, and the resolved region (arriving later) was ignored. Directly failed the core region-default AC. Fixed the effect to lock the guard only on a definitive branch (URL/localStorage active, or a resolved non-`undefined` `defaultRegion`) and to WAIT while `defaultRegion` is still `undefined`; added an async-arrival regression test.
  - `[medium]` `[patch]` `PreferenceSync`'s login-time locale switch used `router.replace(pathname, …)`, which next-intl strips of query params — so switching locale on a filtered URL (`/events?date=…&region=…`) dropped all active filters. Mirrored the established `LocaleSwitcher` idiom (`useSearchParams` → `${pathname}?${query}`); added a query-preservation test.
  - `[medium]` `[patch]` `EventsListing` called `useCurrentUser()` unconditionally, so every anonymous visitor to the public `/events` listing fired a proxied `/users/me` that just 401s. Gated the hook on `useSession()` (`status === "authenticated"`), eliminating the needless authenticated round-trip for logged-out users.
  - `[low]` `[patch]` `PreferenceSync` acted on any `authenticated` session, including one already flagged `error` (invalid Strapi token, about to sign out) — a locale switch off stale data. Added a `session.error` bail guard + test.
  - `[low]` `[patch]` `PreferenceSync` passed the stored language straight into the router with no supported-locale check. Added a defensive `routing.locales.includes(...)` guard + an unsupported-locale no-op test.
  - `[low]` `[patch]` The "user can browse another locale within the session without being forced back" behavior was only trivially tested (identical rerender). Added a real test: after the one-time switch, changing the active locale to a THIRD value with the same `userId` must NOT re-force the preference.
  - `[low]` `[patch]` `useCurrentUser`'s populate+normalize path (the read-back correctness core) was unverified — only the pure `extractRegionDocumentId` helper was tested. Added a hook test asserting `populate: ["avatar","defaultRegion"]` and that a populated relation resolves to a flat `documentId`.

Deferred (2026-07-09): a stale `localStorage` location suppresses the profile `defaultRegion` seed for one visit (self-heals next visit); the `session`/`jwt` callback `preferredLanguage` exposure has no direct unit test (needs a next-auth+env harness the repo lacks); the `EventsListing`→`useCurrentUser`→`EventLocationFilter` wiring has no integration test; the `<PreferenceSync />` layout mount is not pinned. Rejected as noise/by-design: `extractRegionDocumentId` not handling a Strapi-v4 `data`/`attributes` envelope (this project is Strapi v5 — relations are flat); the `auth.ts` unchecked `preferredLanguage` cast (schema enum-constrains it; the consumer now validates against `routing.locales`); the `ProfileForm` read-back test not asserting Radix's visible selected text (jsdom/Radix limitation the repo documents — the save-payload assertion proves read-back); the `PreferenceSync` ref keyed by `userId` not the preference value (no real failure — the profile form owns the mid-session switch); the "misleading `defaultRegion` dependency" (the symptom of the fixed race); and the missing concurrent-venue-restore composition test (pre-existing `latestFiltersRef` logic, unchanged by this story).

### 2026-07-09 — Follow-up review pass

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 13
- addressed_findings:
  - none

This independent follow-up pass (triggered because the prior pass fixed a high-severity region-seed bug) surfaced no new actionable findings. Three reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) produced 16 raw findings; after dedup all resolved to: by-design behaviors already documented in the intent contract (login-time locale re-application "not forced back until the next load"; the profile `defaultRegion` reasserting on a fresh visit; the accepted client-router flash the Block-If mandates; the anonymous restore effect intentionally not latching so an async `defaultRegion` can still arrive), items already captured in the deferred-work ledger from the prior pass (stale-`localStorage` one-visit suppression, the `session`/`jwt` callback exposure lacking a unit test, the `EventsListing`→filter integration seam untested), or noise already litigated last pass (the `userId`-keyed guard vs. mid-session change — ProfileForm owns that switch; the enum-constrained `auth.ts` cast; the type-dead `routing.locales` defensive guard; the duplicated locale union). Two edge-hunter boundary claims (`restoredRef` locked on a resolved-stale value; `defaultRegion === ""`) are non-issues: locking a resolved stale value is correct, and `extractRegionDocumentId` normalizes `""`→`undefined` upstream so the empty string is unreachable via the sole caller. No spec amendment, no code change, no new ledger entry.

## Design Notes

Read-back normalization (the correctness core). `defaultRegion` is a `manyToOne` relation but the profile region `<AppSelect>` value is a region `documentId` (see `profile/page.tsx` mapping `getRegions → { id: documentId }` and `ProfileForm` `regionOptions: { value: r.id }`). So the hook must both populate the relation and flatten it to its `documentId`:

```ts
export function extractRegionDocumentId(
  defaultRegion: unknown
): string | undefined {
  if (typeof defaultRegion === "string") return defaultRegion || undefined
  if (defaultRegion && typeof defaultRegion === "object") {
    const id = (defaultRegion as { documentId?: unknown }).documentId
    return typeof id === "string" ? id : undefined
  }
  return undefined
}
// useCurrentUser: populate ["avatar", "defaultRegion"], then
// return { ...response, defaultRegion: extractRegionDocumentId(response.defaultRegion) }
```

Language application. Mirror `LocaleSwitcher`: `router.replace(pathname, { locale })` from `@/lib/navigation` is the immediate + cookie-persistent switch. `PreferenceSync` guards with a `useRef` seeded to the acted-on `userId` so it fires once per login/mount, not on every render or navigation — after the switch, `locale === preferredLanguage`, so the guard also prevents a loop. It renders `null`.

Region default. `EventLocationFilter` already restores a remembered location on mount and reconciles it against available regions; the profile default is simply a third source consulted only when the URL and localStorage yield nothing, and it is intentionally NOT written back to localStorage (it is a server-side default, not a device choice — persisting it would make it survive sign-out).

## Verification

**Commands:**

- `cd apps/client && yarn test` -- expected: `useUser` (`extractRegionDocumentId`), `PreferenceSync`, extended `EventLocationFilter`, and `ProfileForm` region-read-back tests pass.
- `cd apps/client && yarn typecheck` -- expected: no new type errors in touched files (the pre-existing repo-wide baseline errors in unrelated modules are out of scope).
- `cd apps/client && yarn lint` -- expected: clean on touched files.

**Manual checks (if no CLI):**

- Sign in as a user whose profile language is Arabic while viewing `/fr` → the app switches to `/ar` on load; open `auth/profile` → the previously-saved region is pre-selected; change language and save → the app re-routes immediately and the choice persists on reload.
- As that user, open `/events` with a clean URL and no remembered location → the listing defaults to the profile region; append `?region=<other>` → the URL wins.
  </content>
  </invoke>

## Auto Run Result

Status: done

**Summary:** Implemented Story 4.5, making the user's stored language and region preferences actually drive the app (Story 4.4 already saved them; this story makes them read back and take effect). Three seams over existing infrastructure: (A) `useCurrentUser` now populates `defaultRegion` and flattens the relation to its Strapi `documentId` via a pure `extractRegionDocumentId` helper, so the profile region select pre-fills on reload and other components can read it as a plain string; (B) the NextAuth `session` callback exposes `preferredLanguage` (reusing the existing `/users/me` re-fetch), and a new `PreferenceSync` client component applies it once per authenticated mount via the next-intl navigation router (immediate + `NEXT_LOCALE`-cookie-persistent), preserving query params and refusing unsupported/errored-session cases; (C) `EventLocationFilter` gained a `defaultRegion` prop used as the lowest-precedence restore-on-mount fallback (URL > localStorage > profile default), reconciled against available regions and never persisted to localStorage, threaded from `EventsListing` via an auth-gated `useCurrentUser`.

**Files changed:**

- `apps/client/src/hooks/useUser.ts` — exported `extractRegionDocumentId`; `useCurrentUser` populates + normalizes `defaultRegion` to a `documentId` string.
- `apps/client/src/lib/auth.ts` — `session`/`jwt` callbacks expose `preferredLanguage` from the existing re-fetch.
- `apps/client/src/types/next-auth.d.ts` — `preferredLanguage` on `AppUser` + `JWT`.
- `apps/client/src/components/providers/PreferenceSync.tsx` (NEW) — once-per-authenticated-mount locale application; query-preserving, `routing.locales`-validated, `session.error`-guarded.
- `apps/client/src/app/[locale]/layout.tsx` — mounts `<PreferenceSync />` inside `ClientProviders`.
- `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx` — `defaultRegion` prop as the async-safe, lowest-precedence restore-on-mount fallback.
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — threads an auth-gated `useCurrentUser().data?.defaultRegion` into the filter.
- Tests: NEW `useUser.test.ts` (helper + `useCurrentUser` populate/normalize), NEW `PreferenceSync.test.tsx` (9 cases), extended `EventLocationFilter.test.tsx` (fallback precedence, stale-drop, no-localStorage-write, async-arrival), extended `ProfileForm.test.tsx` (region read-back); `vitest.config.ts` include globs for `src/hooks` + `src/components/providers`.

**Review findings breakdown:** 0 intent_gap, 0 bad_spec. 7 patches applied (1 high: the region-default seed was dead on first load due to an async/one-shot-guard race — fixed + regression test; 2 medium: `PreferenceSync` query-param loss on switch, and an unconditional `/users/me` for anonymous `/events` visitors; 4 low: `session.error` bail, `routing.locales` validation, a real "browse-away" test, and a `useCurrentUser` populate/normalize test). 4 deferred (stale-localStorage suppresses default one-time; session-callback unit test; EventsListing wiring integration test; PreferenceSync layout-mount pin). 6 rejected.

**Follow-up review recommended:** true — the final pass fixed a high-severity correctness bug (the region-default feature was entirely non-functional on a fresh load) plus two medium issues touching the core seams (async restore logic and the locale-switch), so an independent look at the region-seeding + locale-application surface is warranted despite the now-green suite.

**Verification:**

- `cd apps/client && yarn test` → 20 files, 271 tests passing (incl. the new/extended `useUser`, `PreferenceSync`, `EventLocationFilter`, `ProfileForm` tests).
- `cd apps/client && yarn typecheck` → 0 errors in any touched file (the 73 repo-wide errors are the documented pre-existing baseline in unrelated modules — watchlist/geography/venues/tickets/search/maps — out of scope).
- `cd apps/client && yarn lint` → clean on all touched files.

**Residual risks:**

- The `session`/`jwt` callback `preferredLanguage` exposure and the `EventsListing`→filter wiring are verified by inspection + the consumer/unit tests, not a booted integration test (deferred); the `<PreferenceSync />` layout mount is not pinned by a test.
- Applying the stored language on load depends on the `session` callback's `/users/me` re-fetch running on the client — unchanged behavior, but the field passthrough itself is untested end-to-end.
- A stale `localStorage` location can suppress the profile `defaultRegion` seed for a single `/events` visit (self-heals on the next visit; deferred).

---

### Follow-up review pass (2026-07-09)

An independent follow-up review (Blind Hunter + Edge Case Hunter + Verification Gap, run without prior context) was performed on the full baseline→final diff. **Outcome: no changes made.** 16 raw findings deduped to zero actionable items: 0 intent_gap, 0 bad_spec, 0 patch, 0 new defer, 13 reject. All findings resolved to (a) behaviors explicitly documented in the intent contract (login-time locale re-application not forced back mid-session; the profile `defaultRegion` reasserting on a fresh visit; the accepted client-router flash the Block-If mandates; the anonymous restore effect intentionally not latching so an async `defaultRegion` can still seed), (b) items already in the deferred-work ledger from the prior pass (stale-`localStorage` one-visit suppression, the untested `session`/`jwt` callback exposure, the untested `EventsListing`→filter integration seam), or (c) noise already litigated last pass (the `userId`-keyed guard, the enum-constrained `auth.ts` cast, the type-dead `routing.locales` guard, the duplicated locale union). Two boundary claims were verified non-issues (locking `restoredRef` on a resolved-stale value is correct; `defaultRegion === ""` is unreachable because `extractRegionDocumentId` normalizes `""`→`undefined`).

**Verification:** `cd apps/client && yarn test` → 20 files, 271 tests passing (unchanged suite; no production code touched this pass).

**Follow-up review recommended:** false — this pass made zero review-driven changes and the implementation was independently confirmed sound.
