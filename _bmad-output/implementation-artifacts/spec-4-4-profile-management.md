---
title: "Profile Management"
type: "feature"
created: "2026-07-09"
status: "done"
baseline_revision: "bdd51ee8ad9d2b5401214c23e43e35d148d7366b"
final_revision: "811447b012f8fd78bf3f46ee53088afa7215a5c9"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** An authenticated user has a profile page (`auth/profile`) that is fully scaffolded but non-functional: the profile-update and avatar-upload mutations call proxy paths that are NOT in the proxy allowlist (`PUT /users/:id`, `POST /upload`) and are rejected with 403, the email field is hard read-only (no way to change email), there is no self-scoped update endpoint (stock `PUT /users/:id` lets any authenticated user edit ANY user and set `email`/`role`/`confirmed` directly), success/error strings are hardcoded French, and there is no inline field validation. Story 4.4 must make profile editing actually work and safe: change display name, upload/change avatar, change email via a verification flow, save to Strapi, success toast, inline validation errors.

**Approach:** Add a self-scoped `PUT /users/me` controller (`user.updateMe`) in the existing `users-permissions` extension that whitelists mutable fields (`username`, `preferredLanguage`, `defaultRegion`, `avatar`) and never accepts `email`/`role`/`confirmed`/`blocked`/`password`/tokens. Change-email goes through a verification flow that mirrors the Story-4.3 password-reset pattern: `POST /auth/change-email` (authenticated) stores a `pendingEmail` + single-use, time-limited `emailChangeToken` and emails a `CLIENT_EMAIL_CHANGE_URL?code=&email=` confirmation link to the NEW address; `POST /auth/confirm-email-change` (public, clicked from the email) swaps `email = pendingEmail`. Avatar upload posts the file to `POST /upload` (no `ref`) and passes the returned file id into `PUT /users/me` so linkage is self-scoped. Finalize the frontend with a routed profile form (react-hook-form + zod, inline validation, `useToast`, i18n `profile.*`) and a confirm page, and extend the proxy allowlist.

## Boundaries & Constraints

**Always:**

- Profile writes are SELF-ONLY: `user.updateMe` targets `ctx.state.user.id` (never a path id) and ignores every field except `username`, `preferredLanguage`, `defaultRegion`, `avatar`. It MUST NOT set `email`, `role`, `confirmed`, `blocked`, `provider`, `password`, `resetPasswordToken`, `passwordChangedAt`, or any `emailChange*`/`pendingEmail` field even if present in the body.
- Email never changes without confirmation: `POST /auth/change-email` only stages `pendingEmail` + `emailChangeToken` + `emailChangeTokenExpiresAt` and emails the NEW address; the live `email` changes ONLY in `confirm-email-change` after the token is validated (single-use: clear the token+pending fields on success) and unexpired (`emailChangeTokenExpiresAt` set AND `Date.now() >= expiresAt` → reject; boundary is `>=`).
- Backend returns stable error CODES, never prose — `NAME_REQUIRED`, `USERNAME_TAKEN`, `INVALID_EMAIL`, `EMAIL_TAKEN`, `EMAIL_UNCHANGED`, `EMAIL_CHANGE_TOKEN_INVALID`, `EMAIL_CHANGE_TOKEN_EXPIRED` — via the shared `validate(...)`/`ValidationError({ code })` mechanism; the client maps codes → localized `profile.*` strings via next-intl.
- The change-email token is minted with `crypto.randomBytes(64).toString("hex")` and an expiry from the existing `resolveResetTokenTtlMs()` (1h default); the confirmation email is localized AR/FR/EN built with an `escapeHtml`-guarded `buildEmailChangeEmail` and sent via `strapi.plugins.email.services.email.send`; send failures are logged and swallowed.
- `PUT /users/me` MUST be matched BEFORE the stock `PUT /users/:id` (register it at the FRONT of `plugin.routes["content-api"].routes` so `me` is not captured as `:id`).
- Reuse existing pieces: the `strapi-server.ts` capture-and-reassign wrap pattern, `escapeHtml`/`normalizeLocale`/`sanitizeOutputUser`/`validate`/`resolveResetTokenTtlMs`, `buildResetPasswordEmail`/`sendPasswordResetEmail` as the email template, the `?code=&email=` link convention, `PasswordStrengthIndicator`-era RHF+zod+`AppForm`/`AppField` form stack, shadcn `useToast`, `mapErrorToKey` code→i18n mapping, the `useUserMutations` react-query pattern, and the Jest `buildHarness()` / vitest `RegisterForm.test.tsx` test patterns.
- The `jwt.verify` session-invalidation wrap (Story 4.3) reads `passwordChangedAt`; profile/email updates MUST NOT write `passwordChangedAt`, so existing sessions survive a profile edit.

**Block If:**

- Realizing self-scoped `PUT /users/me` or the change-email routes would require replacing the users-permissions auth strategy, or storing tokens/pending state OUTSIDE the user schema (a new store/Redis) rather than the added private user fields.
- The display-name product model must change (e.g. split into a new `firstName`/`lastName` UI decoupled from the existing `username`-as-display-name wiring the session and header already use) — this spec keeps display name = `username`.

**Never:**

- Do not use or allowlist stock `PUT /users/:id` (arbitrary id + arbitrary fields) as the profile-update transport; do not upload the avatar with `ref`/`refId`/`field` (that path lets a user attach media to another user's entry without an ownership check) — link the avatar only through `updateMe`.
- Do not build a rate-limiting subsystem (epic-wide deferred NFR — record in deferred-work); do not modify the register/social-callback/forgot/reset wraps or the `jwt.verify` wrap; do not touch guest/region-preference scope beyond `defaultRegion` (4.5/4.6).
- Do not log or expose tokens or `pendingEmail` in API responses; do not add Arabic-Indic numerals (Western numerals in all locales).

## I/O & Edge-Case Matrix

| Scenario                               | Input / State                                                                | Expected Output / Behavior                                                                              | Error Handling                     |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Update profile — valid                 | `PUT /users/me {username,preferredLanguage,defaultRegion,avatar}`, authed    | only whitelisted fields written to `ctx.state.user.id`; sanitized user returned                         | No error expected                  |
| Update — empty name                    | `username:""`                                                                | reject before write                                                                                     | `NAME_REQUIRED` (400)              |
| Update — duplicate username            | username belongs to another user                                             | Strapi unique violation caught                                                                          | `USERNAME_TAKEN` (400)             |
| Update — forbidden field injected      | body also has `email`/`role`/`confirmed`                                     | forbidden keys stripped; only whitelist applied                                                         | No error; fields ignored           |
| Request email change — free email      | `POST /auth/change-email {email}`, authed, email unused                      | `pendingEmail`+`emailChangeToken`+expiry persisted; localized email sent to NEW address; `{ ok: true }` | No error expected                  |
| Request email change — taken email     | email belongs to a different user                                            | no staging, no email                                                                                    | `EMAIL_TAKEN` (400)                |
| Request email change — same as current | email == current `email`                                                     | no-op                                                                                                   | `EMAIL_UNCHANGED` (400)            |
| Request email change — send fails      | provider throws                                                              | `strapi.log.error`, still `{ ok: true }` (staged)                                                       | Swallow, log                       |
| Confirm email change — valid           | `POST /auth/confirm-email-change {code}`, unexpired, pendingEmail still free | `email=pendingEmail`; token+pending fields cleared; `{ ok: true }`                                      | No error expected                  |
| Confirm — expired token                | `emailChangeTokenExpiresAt` in the past                                      | reject, no change                                                                                       | `EMAIL_CHANGE_TOKEN_EXPIRED` (400) |
| Confirm — unknown/used token           | no user matches code                                                         | reject                                                                                                  | `EMAIL_CHANGE_TOKEN_INVALID` (400) |
| Confirm — pendingEmail taken meanwhile | another user registered it since staging                                     | reject, no change                                                                                       | `EMAIL_TAKEN` (400)                |
| Proxy — non-allowlisted profile path   | e.g. `PUT api/users/5`                                                       | proxy 403                                                                                               | Path not accessible                |

</intent-contract>

## Code Map

- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add three private, `configurable:false` fields: `pendingEmail` (email), `emailChangeToken` (string), `emailChangeTokenExpiresAt` (datetime). `avatar` (media, single, images), `firstName`, `preferredLanguage`, `defaultRegion` already exist.
- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- (a) add exported `buildEmailChangeEmail(locale,name,url)` (mirror `buildResetPasswordEmail` L139-163) + `sendEmailChangeEmail(user,pendingEmail,url,requestLocale?)` (mirror `sendPasswordResetEmail` L216-238 but `to: pendingEmail`); (b) add `plugin.controllers.user.updateMe` (self-scoped, field-whitelisted, `validate(updateMeSchema,…)`, `service("user").edit(ctx.state.user.id,data)`, unique-violation→`USERNAME_TAKEN`, returns `sanitizeOutputUser`); (c) add `plugin.controllers.auth.changeEmail` (authed, `validate` email, uniqueness→`EMAIL_TAKEN`, same-as-current→`EMAIL_UNCHANGED`, mint token+expiry, stage, send email, `{ok:true}`) and `plugin.controllers.auth.confirmEmailChange` (public, lookup by `emailChangeToken`, expiry `>=` reject, re-check pendingEmail free, set `email`, clear staging, `{ok:true}`); (d) register routes — UNSHIFT `PUT /users/me → user.updateMe` before stock `:id`, and push `POST /auth/change-email → auth.changeEmail`, `POST /auth/confirm-email-change → auth.confirmEmailChange` to `plugin.routes["content-api"].routes`. Add zod `updateMeSchema` (`username` trim min1→`NAME_REQUIRED`, `preferredLanguage` enum, `defaultRegion`, `avatar` optional) and `changeEmailSchema` (`email().email("INVALID_EMAIL")`).
- `apps/strapi/.env.example` -- add `CLIENT_EMAIL_CHANGE_URL` (mirror `CLIENT_RESET_PASSWORD_URL` L129-135); TTL reuses existing `RESET_TOKEN_TTL_MS`.
- `apps/strapi/src/extensions/users-permissions/profile-management.unit.test.ts` (NEW, Jest) -- `buildHarness()` mock-strapi pattern (mirror `password-reset.unit.test.ts`); cover every I/O matrix row incl. self-scoping, forbidden-field stripping, `USERNAME_TAKEN`, change-email uniqueness/unchanged, send-failure-still-ok, confirm expiry/invalid/taken-meanwhile.
- `apps/strapi/docs/PERMISSIONS.md` -- document the concrete endpoints: `PUT /api/users/me` (Authenticated), `POST /api/auth/change-email` (Authenticated), `POST /api/auth/confirm-email-change` (Public), and `POST /api/upload` (Authenticated) — the Authenticated/Public role grants an operator must enable (permissions are managed via the Admin Panel per project convention, not seeded in code).
- `apps/client/src/lib/strapi-api/request-auth.ts` -- extend `ALLOWED_STRAPI_ENDPOINTS`: add `PUT: ["api/users/me"]`; add to `POST` `api/upload`, `api/auth/change-email`, `api/auth/confirm-email-change`. Do NOT add `api/users` (would allow `PUT api/users/:id`).
- `apps/client/src/hooks/useUser.ts` -- `updateProfileMutation` → `PUT /users/me` (drop `userId` from the path; payload `{username?,preferredLanguage?,defaultRegion?,avatar?:number}`); `uploadAvatarMutation` → `POST /api/private-proxy/upload` with FormData `files` ONLY (no `ref`/`refId`/`field`), return the uploaded file **id**; add `requestEmailChangeMutation` (POST `/auth/change-email` `{email}`) and `confirmEmailChangeMutation` (POST `/auth/confirm-email-change` `{code}`, via `PublicStrapiClient`). Keep `['user','me']` invalidation on success.
- `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.tsx` (NEW, routed) -- RHF + `zodResolver` (`mode:"onBlur"`), inline validation via `AppForm`/`AppField`/`FormMessage`, `useToast`, `useTranslations("profile")`; renders avatar (`AvatarUpload`), name, language, region, a read-only email display with a "Change email" sub-form calling `requestEmailChangeMutation`; on save uploads pending avatar → passes returned id into `updateProfileMutation`; maps error codes via a `mapErrorToKey`-style helper to `profile.errors.*`. Distinct from the shared presentational `features/auth/.../ProfileForm` (kept for Storybook).
- `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.tsx` -- render the new routed `ProfileForm`; remove hardcoded French strings (use `profile.*`); pass `user.id`/regions through; keep the change-password / sign-out actions.
- `apps/client/src/app/[locale]/auth/change-email/page.tsx` (NEW) + `_components/ConfirmEmailChange.tsx` (NEW) -- RSC reads `code` from `searchParams` (array-normalized to first element); client component calls `confirmEmailChangeMutation`, shows success/`EMAIL_CHANGE_TOKEN_*` outcomes, prompts sign-in to refresh the session email.
- `apps/client/locales/{en,fr,ar}.json` -- add a `profile.*` namespace (labels + `changeEmail.*` + `errors.{NAME_REQUIRED,USERNAME_TAKEN,INVALID_EMAIL,EMAIL_TAKEN,EMAIL_UNCHANGED,EMAIL_CHANGE_TOKEN_INVALID,EMAIL_CHANGE_TOKEN_EXPIRED,unexpectedError}` + toast success/error). Western numerals in Arabic.
- `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.test.tsx` (NEW) + `.../change-email/_components/ConfirmEmailChange.test.tsx` (NEW) -- vitest; mirror `ResetPasswordForm.test.tsx` mocking (`useUserMutations` mutate spies, `useCurrentUser`, `next-intl`, `next/navigation`, `use-toast`, `general-helpers` stub). Assert: profile save payload (avatar id threaded), inline name-required error, error-code→message mapping, change-email request payload + "email sent" toast, and confirm success/expired/invalid branches. Add the new dirs to `vitest.config.ts` `include`.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add `pendingEmail` (email), `emailChangeToken` (string), `emailChangeTokenExpiresAt` (datetime), all `private:true`, `configurable:false`.
- [x] `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- add `updateMeSchema`/`changeEmailSchema`; `buildEmailChangeEmail`/`sendEmailChangeEmail`; `user.updateMe` (self-scoped whitelist `{username,preferredLanguage,defaultRegion,avatar}`, strip all else, `validate`, `edit(ctx.state.user.id,…)`, unique→`USERNAME_TAKEN`, return `sanitizeOutputUser`); `auth.changeEmail` (validate + uniqueness `EMAIL_TAKEN` + `EMAIL_UNCHANGED`, mint `randomBytes(64)` token + `resolveResetTokenTtlMs()` expiry, stage `pendingEmail`, build `CLIENT_EMAIL_CHANGE_URL?code=&email=<pendingEmail>` link, send localized email, swallow+log send error, `{ok:true}`; warn if `CLIENT_EMAIL_CHANGE_URL` unset); `auth.confirmEmailChange` (lookup by token, expiry `>=` → `EMAIL_CHANGE_TOKEN_EXPIRED`, no user → `EMAIL_CHANGE_TOKEN_INVALID`, pendingEmail-now-taken → `EMAIL_TAKEN`, else set `email=pendingEmail` and clear `pendingEmail`/`emailChangeToken`/`emailChangeTokenExpiresAt`, `{ok:true}`); register routes (UNSHIFT `PUT /users/me`, push the two `/auth/*`). Do not touch existing wraps.
- [x] `apps/strapi/.env.example` -- add `CLIENT_EMAIL_CHANGE_URL` with placeholder + comment.
- [x] `apps/strapi/src/extensions/users-permissions/profile-management.unit.test.ts` (NEW, Jest) -- cover every I/O matrix row incl. forbidden-field stripping, self-scope (writes `ctx.state.user.id` regardless of any body id), `USERNAME_TAKEN`, change-email `EMAIL_TAKEN`/`EMAIL_UNCHANGED`, send-failure-still-`{ok:true}`, confirm expired/invalid/pending-taken/success + staging-cleared.
- [x] `apps/strapi/docs/PERMISSIONS.md` -- document the four endpoints and the Authenticated/Public grants required (operator enables via Admin Panel).
- [x] `apps/client/src/lib/strapi-api/request-auth.ts` -- add `PUT: ["api/users/me"]` and POST entries `api/upload`, `api/auth/change-email`, `api/auth/confirm-email-change`.
- [x] `apps/client/src/hooks/useUser.ts` -- retarget `updateProfileMutation` to `PUT /users/me` (payload incl. optional `avatar:number`); make `uploadAvatarMutation` upload the file only and return its id; add `requestEmailChangeMutation` + `confirmEmailChangeMutation`.
- [x] `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.tsx` (NEW) -- RHF+zod routed form: inline validation, avatar upload→id threading, name/language/region save, email change sub-form, toast on save, code→i18n error mapping.
- [x] `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.tsx` -- render the routed form; replace hardcoded strings with `profile.*`; wire mutations.
- [x] `apps/client/src/app/[locale]/auth/change-email/page.tsx` (NEW) + `_components/ConfirmEmailChange.tsx` (NEW) -- confirm page reading array-normalized `code`, calling `confirmEmailChangeMutation`, rendering success/`EMAIL_CHANGE_TOKEN_*` outcomes.
- [x] `apps/client/locales/en.json`, `fr.json`, `ar.json` -- add `profile.*` labels, `changeEmail.*`, and error/toast keys (Western numerals in AR).
- [x] `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.test.tsx` (NEW) + `.../change-email/_components/ConfirmEmailChange.test.tsx` (NEW) + `apps/client/vitest.config.ts` include-globs -- vitest; assert save payload (avatar id), inline name error, error mapping, change-email request + toast, confirm success/expired/invalid.

**Acceptance Criteria:**

- Given a logged-in user on `auth/profile`, when they change display name / language / region / avatar and save, then only their own record is updated via `PUT /users/me` (no other user, no privileged field), the avatar is uploaded and linked, the change persists in Strapi, and a localized success toast is shown.
- Given the user submits an empty name or a username already taken, when they save, then the corresponding inline field error (`NAME_REQUIRED` / `USERNAME_TAKEN`) is shown and nothing is persisted.
- Given the user requests an email change to a free address, when they submit, then their live `email` is unchanged, a `pendingEmail` + single-use time-limited token are staged, a localized confirmation email is sent to the NEW address, and the UI confirms "verification email sent"; requesting a taken or unchanged address returns `EMAIL_TAKEN`/`EMAIL_UNCHANGED` inline.
- Given a valid, unexpired confirmation link, when the user opens it, then `email` is updated to `pendingEmail`, the token and pending fields are cleared, and the confirm page reports success; an expired/used/invalid link reports `EMAIL_CHANGE_TOKEN_EXPIRED`/`EMAIL_CHANGE_TOKEN_INVALID` and makes no change.
- Given a profile or email update completes, when the user continues using the app, then their existing session remains valid (no `passwordChangedAt` write), confirming the Story-4.3 session-invalidation wrap is untouched.

## Spec Change Log

_No `bad_spec` loopback occurred. The review confirmed the captured intent and approach were sound; all findings were patches or deferrals._

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 3, low 5)
- defer: 9: (high 0, medium 4, low 5)
- reject: 4
- addressed_findings:
  - `[medium]` `[patch]` Email-uniqueness checks in `changeEmail`/`confirmEmailChange` used case-SENSITIVE exact match, but local registration never lowercases the stored email — a case-variant of an existing address (`Foo@Bar.com` vs `foo@bar.com`) would evade `EMAIL_TAKEN` and allow a duplicate/verification-bypass. Switched both lookups to case-insensitive `$eqi`.
  - `[medium]` `[patch]` The route-ordering invariant (`PUT /users/me` before stock `/users/:id` — the story's central privilege-escalation guard) was untested: the fixture seeded an EMPTY routes array, so a regression to `push(me)` still left `me` at index 0 and passed. Added a test that seeds a stock `PUT /users/:id` and asserts `indexOf(me) < indexOf(:id)`.
  - `[medium]` `[patch]` The proxy allowlist boundary (`api/users/me` allowed; stock `api/users/:id` NOT exposed; avatar/email-change POSTs allowed) had zero tests. Added `request-auth.test.ts` asserting the allow/deny matrix incl. `PUT api/users/5 → false`.
  - `[low]` `[patch]` `confirmEmailChange` enforced expiry only when `emailChangeTokenExpiresAt` was truthy (fail-OPEN on a null/unparseable expiry). Since a change-email token is ALWAYS minted with an expiry, made it fail-CLOSED (missing/unparseable → `EMAIL_CHANGE_TOKEN_EXPIRED`); fixed the two unit tests that had cemented the fail-open path and added an explicit fail-closed test.
  - `[low]` `[patch]` `confirmEmailChange`'s final `edit` had no unique-violation catch, so a TOCTOU race on the pending address surfaced an unmapped 500 instead of `EMAIL_TAKEN`. Wrapped it and mapped the violation.
  - `[low]` `[patch]` The `USERNAME_TAKEN` classifier inspected only `err.message`; some drivers carry the unique signal in `err.details`. Extracted a shared `isUniqueViolation()` that checks both (reused by the confirm TOCTOU catch).
  - `[low]` `[patch]` `updateMeSchema.avatar` leaked Zod default prose on a non-number; added `invalid_type_error: "INVALID_AVATAR"` for a stable code.
  - `[low]` `[patch]` The confirm-page `EMAIL_TAKEN` branch (pending address claimed meanwhile) was unmapped-untested; added a `ConfirmEmailChange` test asserting `errors.EMAIL_TAKEN` renders.

Deferred (2026-07-09): change-email is an authenticated arbitrary-recipient email primitive + confirm-email is a public token surface (rate-limiting, epic-wide); no notification to the OLD email address on change; `POST /api/upload` allow-listed by path only (relies on operator not granting `Upload.update`); saved-avatar removal unsupported (not in AC); `EMAIL_TAKEN` enumeration oracle for authed users; avatar-upload orphans media on a failed save; confirmation email ignores active UI locale (client sends only `{email}`); the avatar upload mutationFn (file-only, `[0].id`) is not unit-tested; no integration test proves `/users/me` is authenticated + self-scoped by the live strategy. Rejected as noise/by-design: unvalidated avatar file-id ownership (media is public); `defaultRegion` "cannot be cleared" (the region select offers no empty option, so unreachable via UI); the `sanitizeOutputUser`-leak gap (already covered — the `updateMe` test asserts `sanitize.output` was called, so skipping it fails); the unused `&email=` param in the confirm link (harmless, matches the reset-link convention).

### 2026-07-09 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 2: (high 0, medium 0, low 2)
- reject: 14
- addressed_findings:
  - `[low]` `[patch]` The `confirmEmailChange` final-write TOCTOU catch (a unique-constraint violation on the confirm `edit`, added in the prior pass, mapped to `EMAIL_TAKEN` instead of a raw 500) had no test — the harness `userEdit` always resolved, so the branch was dead. Added a Jest test that passes the pre-check (`userByEmail: null`) but makes `userEdit` throw a unique violation and asserts the result is `EMAIL_TAKEN` (183 tests now pass).

New defers (2026-07-09, follow-up): the proxy allowlist matcher uses `startsWith`, widening the new `api/upload`/`api/users/me` entries to prefixed variants (hardening); three untested `ProfileForm` branches (post-save language-change redirect, avatar-upload-failure abort, `defaultRegion` client payload path). Rejected as dups of already-ledgered items or by-design: rate-limiting, old-email notification, avatar file-id IDOR, token/`&email=` in the confirm URL, `EMAIL_TAKEN` enumeration, orphaned-avatar-on-failed-save, mutationFn/`/users/me` integration coverage, client-only file-size validation, and the "Remove" button not clearing a saved avatar (all already deferred/rejected); session-survives-email-change (spec-mandated — no `passwordChangedAt` write); `INVALID_AVATAR` unmapped on the client (unreachable — the client only ever sends a numeric avatar id); `isUniqueViolation` regex breadth and invalid-`defaultRegion`→500 (low-confidence, `defaultRegion`/`avatar` are relations, not unique constraints); confirm-page `firstParam` normalization untested (thin pass-through).

## Design Notes

Self-scoped update (the security core): stock `PUT /users/:id` in users-permissions accepts an arbitrary path id and an arbitrary body (including `email`, `role`, `confirmed`, `blocked`). Exposing it — as the scaffolded client + a naive allowlist would — is a privilege-escalation and verification-bypass hole. Instead add a `me` route whose controller ignores the path and writes only `ctx.state.user.id`, applying a fixed whitelist:

```ts
plugin.controllers.user.updateMe = async (ctx) => {
  const userId = ctx.state.user?.id
  if (!userId) return ctx.unauthorized()
  const body = ctx.request.body ?? {}
  const data = validate(updateMeSchema, {
    username: body.username,
    preferredLanguage: body.preferredLanguage,
    defaultRegion: body.defaultRegion,
    avatar: body.avatar, // uploaded file id, linked self-scoped here
  })
  try {
    const updated = await strapi
      .plugin("users-permissions")
      .service("user")
      .edit(userId, data)
    ctx.body = await sanitizeOutputUser(updated, ctx)
  } catch (err) {
    if (/unique|already taken|ER_DUP/i.test(err?.message ?? ""))
      // username unique violation
      throw new ValidationError("USERNAME_TAKEN", { code: "USERNAME_TAKEN" })
    throw err
  }
}
// route registration — me BEFORE :id
plugin.routes["content-api"].routes.unshift({
  method: "PUT",
  path: "/users/me",
  handler: "user.updateMe",
  config: { prefix: "", policies: [] },
})
```

Change-email mirrors password-reset exactly (stage a token, email a `?code=&email=` link, confirm swaps the field) but the token lands in dedicated `emailChange*` fields (not `resetPasswordToken`, which the reset/activation flow owns) and the email goes to `pendingEmail`, not `user.email`. Confirm does NOT auto-login and does NOT stamp `passwordChangedAt` — an email change should not invalidate the active session. Because the NextAuth `session` callback re-fetches `/users/me` each call, the client session email refreshes after confirmation; the confirm page nudges a re-sign-in to make that immediate. Display name maps to `username` (the existing session/header/initialData wiring), so `updateMe` writes `username` and surfaces its unique-constraint violation as `USERNAME_TAKEN`. Avatar is uploaded file-only then linked through `updateMe` (not via `POST /upload` `ref`/`refId`, which performs no entry-ownership check).

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: unit gate green incl. `profile-management.unit.test.ts` (self-scope, whitelist, `USERNAME_TAKEN`, change-email uniqueness/unchanged/send-failure, confirm expiry/invalid/taken/success).
- `cd apps/strapi && yarn type-check` -- expected: no new type errors in touched files.
- `cd apps/client && yarn typecheck` -- expected: no new type errors.
- `cd apps/client && yarn lint` -- expected: clean on touched files.
- `cd apps/client && yarn test` -- expected: `ProfileForm`/`ConfirmEmailChange` tests pass (save payload w/ avatar id, inline validation, error mapping, change-email request + toast, confirm branches).

**Manual checks (if no CLI):**

- Sign in, edit name/language/region/avatar, save → success toast; reload → values persisted; `GET /users/me` reflects them. Confirm a second user cannot be edited (no `PUT /users/:id` path is allowlisted).
- Request an email change → live email unchanged, confirmation email logged/delivered to the NEW address with a `CLIENT_EMAIL_CHANGE_URL?code=…&email=…` link; open the link → email updated; reopen the used/expired link → invalid/expired outcome.

## Auto Run Result

Status: done

**Summary:** Implemented Story 4.4 profile management end-to-end and made the previously-scaffolded (403-broken) profile page functional and safe. Backend adds a self-scoped `PUT /users/me` (`user.updateMe`) in the users-permissions extension that writes ONLY `ctx.state.user.id` with a fixed whitelist (`username`, `preferredLanguage`, `defaultRegion`, `avatar`) — never `email`/`role`/`confirmed`/`blocked`/`password`/tokens/`passwordChangedAt` — closing the stock `PUT /users/:id` privilege-escalation/verification-bypass hole. Email changes go through a verification flow mirroring the Story-4.3 reset pattern: `POST /auth/change-email` (authenticated) stages `pendingEmail` + a single-use, time-limited `emailChangeToken` and emails a localized AR/FR/EN confirmation link (`CLIENT_EMAIL_CHANGE_URL?code=&email=`) to the NEW address; `POST /auth/confirm-email-change` (public) swaps `email = pendingEmail`, without touching `passwordChangedAt`. `PUT /users/me` is registered at the FRONT of the content-api routes so `me` is matched before stock `:id`. Frontend delivers a routed RHF+zod profile form (inline validation, `useToast`, `profile.*` i18n, avatar uploaded file-only then linked through `updateMe`, code→i18n error mapping) plus a confirm-email landing page, and the proxy allowlist gains `PUT api/users/me` + the avatar/email POSTs (never `api/users`).

**Files changed:**

- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` — `pendingEmail`/`emailChangeToken`/`emailChangeTokenExpiresAt` (private).
- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` — `user.updateMe`, `auth.changeEmail`, `auth.confirmEmailChange`, `buildEmailChangeEmail`/`sendEmailChangeEmail`, `isUniqueViolation` helper, case-insensitive (`$eqi`) email uniqueness, fail-closed confirm expiry, TOCTOU→`EMAIL_TAKEN`, route registration.
- `apps/strapi/.env.example` — `CLIENT_EMAIL_CHANGE_URL`.
- `apps/strapi/src/extensions/users-permissions/profile-management.unit.test.ts` (NEW, Jest) — full I/O matrix + fail-closed + route-ordering (seeded `:id`) tests.
- `apps/strapi/docs/PERMISSIONS.md` — new endpoints + Authenticated/Public grants.
- `apps/client/src/lib/strapi-api/request-auth.ts` (+ NEW `request-auth.test.ts`) — allowlist + boundary tests.
- `apps/client/src/hooks/useUser.ts` — `updateProfileMutation`→`PUT /users/me`, file-only `uploadAvatarMutation` returning the file id, `requestEmailChangeMutation`/`confirmEmailChangeMutation`.
- `apps/client/src/app/[locale]/auth/profile/_components/ProfileForm.tsx` (NEW) + `ProfileForm.test.tsx` (NEW) + `ProfilePageClient.tsx` (i18n, wiring).
- `apps/client/src/app/[locale]/auth/change-email/page.tsx` (NEW) + `_components/ConfirmEmailChange.tsx` (NEW) + `ConfirmEmailChange.test.tsx` (NEW).
- `apps/client/locales/{en,fr,ar}.json` — `profile.*` namespace. `apps/client/vitest.config.ts` — include globs.

**Review findings breakdown:** 0 intent_gap, 0 bad_spec. 8 patches applied (3 medium: case-insensitive email uniqueness, route-ordering test, allowlist test; 5 low: fail-closed confirm expiry + test fix, TOCTOU→`EMAIL_TAKEN`, `USERNAME_TAKEN` detection via `err.details`, `INVALID_AVATAR` code, confirm `EMAIL_TAKEN` test). 9 deferred (rate-limiting/arbitrary-recipient, old-email notification, upload-endpoint surface, saved-avatar removal, enumeration oracle, avatar-orphan-on-failure, email locale, upload-mutationFn test, `/users/me` integration test). 4 rejected.

**Follow-up review recommended:** true — this security-sensitive auth story changed behavior in the final pass (case-insensitive uniqueness, fail-closed expiry semantics, TOCTOU error mapping) and added the two central security-invariant tests; an independent look at the auth/security surface is warranted despite full unit coverage.

**Verification:**

- `cd apps/strapi && yarn test` → 13 suites, 182 tests passing (incl. `profile-management.unit.test.ts`, 22 tests).
- `cd apps/strapi && yarn type-check` → clean.
- `cd apps/client && yarn test` → 18 files, 245 tests passing (incl. `ProfileForm`, `ConfirmEmailChange`, `request-auth`).
- `cd apps/client && yarn typecheck` → no errors in any touched file (the 73 repo-wide errors are the pre-existing baseline in unrelated files — watchlist/geography/venues/tickets/search/maps — out of scope). `yarn lint` → clean on touched files.

**Residual risks:**

- Session-scoping of `PUT /users/me` and the route grant are verified by unit tests + inspection, not a booted integration/e2e test (deferred); the endpoint depends on an operator enabling the `User.updateMe` Authenticated grant (documented in `PERMISSIONS.md`).
- The case-insensitive uniqueness fix relies on Strapi Query Engine `$eqi` support (documented); it is not exercised by the mocked unit tests.
- Rate-limiting, old-address change-notification, and the enumeration oracle on `change-email` remain (deferred to the epic-wide auth-hardening story).

---

### Follow-up review pass (2026-07-09)

An independent follow-up review (Blind Hunter + Edge Case Hunter + Verification Gap) re-examined the frozen diff. The security core (self-scoped `updateMe`, field whitelist, fail-closed token expiry, route-order unshift, `$eqi` uniqueness) held up — no auth bypass or privilege escalation survived scrutiny. Triage: 0 intent_gap, 0 bad_spec, **1 patch**, 2 new defers, 14 rejects.

- **Patch applied:** added a Jest test covering the `confirmEmailChange` final-write TOCTOU branch (unique-constraint violation on the confirm `edit` → `EMAIL_TAKEN`), which the prior pass introduced but left untested. Strapi suite now **13 suites / 183 tests** (was 182).
- **New defers:** `startsWith` allowlist-matcher widening on the new `api/upload`/`api/users/me` entries; three untested `ProfileForm` UI branches (language-change redirect, avatar-upload-failure abort, `defaultRegion` client payload).
- **Rejected:** re-discoveries of already-ledgered items (rate-limiting, old-email notification, avatar IDOR, orphaned avatar, enumeration oracle, mutationFn/integration coverage, upload-endpoint surface, saved-avatar removal), by-design behavior (session survives email change per spec; token/`&email=` in the confirm URL mirrors the reset convention), and unreachable/low-confidence findings (`INVALID_AVATAR` unmapped on a client that only sends a numeric id).

**Follow-up review recommended:** false — this pass made a single localized, low-consequence test addition with no behavior/API change.

**Verification:** `cd apps/strapi && yarn test` → 13 suites, 183 tests passing.
