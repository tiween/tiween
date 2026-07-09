---
title: "Social Login with Google and Facebook"
type: "feature"
created: "2026-07-09"
status: "done"
baseline_revision: "f4bb4d719fa51e959b9953a7070741c32b5fc8a5"
final_revision: "69346cc4f032b1f2d4b74daa12ebee2062d15be7"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Visitors can only register with email/password (Story 4.1). Story 4.2 requires "Continue with Google / Facebook" on the login and register pages so people can sign in without a new password. The frontend is ~90% pre-wired (NextAuth `jwt` callback already exchanges `GET /auth/${provider}/callback?access_token=` with Strapi and maps errors), but the two OAuth **providers are not registered** in NextAuth, the routed signin page renders the non-social form, the register page has no social buttons, env credentials are absent, and — critically — the Strapi backend does not have the providers **enabled** in its grant store, never populates the profile (name/avatar) from the provider, and **rejects** a social login whose email already exists under a different provider ("Email is already taken") instead of linking it.

**Approach:** Register `GoogleProvider`/`FacebookProvider` in `lib/auth.ts` (only when their env creds are present) and surface the reused `SocialLogin` buttons on both the signin and register pages, calling `signIn(provider, { callbackUrl })`. On the backend, idempotently enable `google`/`facebook` in the users-permissions `grant` plugin store via a versioned bootstrap (stock v5.33.1 gates the callback on `enabled`), and extend the existing `strapi-server.ts` to wrap `controllers.auth.callback` so that (a) a matching-email account is **linked** (signed into) rather than duplicated, and (b) a brand-new social account gets `firstName` + `avatarUrl` from the provider and a non-blocking localized welcome email.

## Boundaries & Constraints

**Always:**

- OAuth handshake runs in NextAuth (`next-auth/providers/{google,facebook}`); the browser never talks to Strapi directly. NextAuth's `jwt` callback already calls Strapi `GET /auth/${account.provider}/callback?access_token=…` — do not change that wiring. Register each provider in `authOptions.providers` **only when** its `*_CLIENT_ID` and `*_CLIENT_SECRET` env vars are set.
- Strapi must have `google` and `facebook` `enabled` in the users-permissions **`grant` plugin store** (stock `callback` throws "This provider is disabled" otherwise). Seed this idempotently in a versioned bootstrap — never rely on manual Strapi Admin edits.
- **Account linking (trusted providers only — `google`, `facebook`):** a social login whose provider-verified email matches an existing account signs into that **same** account (no duplicate). Never overwrite an existing `local` user's `provider` field (password login must keep working). Google and Facebook both return verified emails, which is what makes email-linking safe here.
- **First-time social account:** persist the provider display name as `firstName` and the provider avatar URL as `avatarUrl` (best-effort), create with role `authenticated`, `confirmed: true`, `username = email` (consistent with 4.1), and send a non-blocking localized welcome email (reuse the exported `sendWelcomeEmail`; no request locale is available, so it defaults to `fr`). Name/avatar/email-send failures MUST NOT fail login.
- Non-trusted providers and the `local` path delegate to the stock controller unchanged. Reuse the presentational `features/auth/components/SocialLogin` and the existing `SignInFormWithSocial` OAuth handler. TypeScript strict, no `any`; co-locate tests; Western numerals in Arabic; server surfaces stable error codes / stock messages, never new prose.

**Block If:**

- The installed stock `@strapi/plugin-users-permissions` (`v5.33.1`) `controllers.auth.callback`, the `access_token` query path, or the grant-store `enabled` gate differ materially from the investigated behavior, such that wrapping `plugin.controllers.auth.callback` (the proven 4.1 register-override surface) or seeding the grant store cannot attach.

**Never:**

- Do not auto-link non-trusted / non-verified-email providers, and do not create a second account for an email that already exists.
- Do not upload the provider avatar into the Strapi media library (`avatar` media relation) — capture the URL into `avatarUrl` only; media reconciliation is Story 4.4's concern.
- Do not implement password reset (4.3), profile editing / avatar-upload UI (4.4), or language/region UI (4.5).
- Do not add Redis rate-limiting here (cross-cutting auth-epic item already recorded in `deferred-work.md`).
- Do not remove the existing `oauth_error` / `different_provider` handling in `lib/auth.ts` — keep it as a defensive fallback. Do not change the NextAuth session strategy or the credentials flow. Do not transform Strapi responses or use Entity Service.

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                        | Expected Output / Behavior                                                                                                                                                                          | Error Handling                                                |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| New Google user              | valid Google `access_token`, email not in DB         | user created (`provider:google`, `confirmed:true`, `username=email`, `firstName`=name, `avatarUrl` set); `{jwt,user}` returned; welcome email queued; NextAuth logs in + redirects to `callbackUrl` | none                                                          |
| New Facebook user            | valid FB `access_token`, email not in DB             | analogous to Google (`provider:facebook`)                                                                                                                                                           | none                                                          |
| Repeat social login          | email exists with `provider` = same social provider  | returns existing user; `{jwt,user}`; **no** new welcome email; no field overwrite                                                                                                                   | none                                                          |
| Cross-provider link          | email exists with `provider:local`, login via Google | signs into the **same** existing account (no duplicate; `provider` stays `local`); `{jwt,user}`; no welcome email                                                                                   | none                                                          |
| Provider returns no email    | `access_token` yields no email                       | login rejected, no account created                                                                                                                                                                  | stock "Email was not available." → client `oauth_error` toast |
| Welcome-email failure        | email provider errors/unset on new account           | new-user login still succeeds                                                                                                                                                                       | logged server-side, not surfaced                              |
| Provider not configured (FE) | `*_CLIENT_ID/SECRET` env absent                      | social buttons hidden; email/password auth unaffected                                                                                                                                               | no broken/erroring buttons                                    |

</intent-contract>

## Code Map

- `apps/client/src/lib/auth.ts` -- add `GoogleProvider`+`FacebookProvider` (each gated on its env creds); the OAuth `jwt`/`session` exchange + `oauth_error`/`different_provider` mapping already exist (lines 77-107) — do not touch.
- `apps/client/src/app/[locale]/auth/signin/page.tsx` -- currently renders `<SignInForm/>`; render `<SignInFormWithSocial/>` passing `enableGoogle`/`enableFacebook` from server-side env presence.
- `apps/client/src/app/[locale]/auth/signin/_components/SignInFormWithSocial.tsx` -- REUSE; `handleOAuthSignIn(provider)` → `signIn(provider,{callbackUrl})` already implemented (lines 98-110).
- `apps/client/src/app/[locale]/auth/register/page.tsx` + `register/_components/RegisterForm.tsx` -- add reused `SocialLogin` with `signIn(provider,{callbackUrl})` handlers + per-provider loading; gate visibility on env-derived enable flags.
- `apps/client/src/features/auth/components/SocialLogin/SocialLogin.tsx` -- REUSE presentational buttons (props: `onGoogleClick`,`onFacebookClick`,`isGoogleLoading`,`isFacebookLoading`,`labels`).
- `apps/client/locales/{en,fr,ar}.json` -- `auth.social.*` already exists; add localized messages keyed to NextAuth `session.error` values `oauth_error` / `different_provider`.
- `apps/client/.env.local.example` -- add `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`.
- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- extend default export to ALSO wrap `plugin.controllers.auth.callback` (linking + new-user enrichment); add exported `fetchSocialProfile(provider,accessToken)`; REUSE exported `sendWelcomeEmail`. Existing register override stays.
- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add `avatarUrl` (string). `avatar` (media), `firstName`, `preferredLanguage`, `provider` already exist.
- `apps/strapi/src/bootstrap/social-providers.ts` (NEW) + `apps/strapi/src/index.ts` -- enable `google`/`facebook` in the `grant` plugin store idempotently; call from `bootstrap()` alongside the existing `ensure*` helpers.
- `apps/strapi/src/extensions/users-permissions/register.unit.test.ts` -- REFERENCE the `buildHarness()` mock-`strapi` pattern for the new backend test.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/lib/auth.ts` -- add `GoogleProvider` and `FacebookProvider` from `next-auth/providers/*`, each pushed into `providers` only when its `*_CLIENT_ID` + `*_CLIENT_SECRET` env vars are present; leave the credentials provider and jwt/session callbacks unchanged.
- [x] `apps/client/.env.local.example` -- add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` with placeholder values + a comment noting they enable the social buttons.
- [x] `apps/client/src/app/[locale]/auth/signin/page.tsx` -- render `SignInFormWithSocial` (replacing `SignInForm`), passing `enableGoogle`/`enableFacebook` computed from `process.env.{GOOGLE,FACEBOOK}_CLIENT_ID`+`_SECRET` presence.
- [x] `apps/client/src/app/[locale]/auth/register/page.tsx` + `apps/client/src/app/[locale]/auth/register/_components/RegisterForm.tsx` -- render the reused `SocialLogin` above/below the form with `signIn("google"|"facebook", { callbackUrl })` handlers and per-provider loading state; visibility gated on env-derived enable flags passed from the page.
- [x] `apps/client/locales/en.json`, `fr.json`, `ar.json` -- add localized user-facing messages for the NextAuth `session.error` codes `oauth_error` and `different_provider` (Western numerals in Arabic); wire the signin/register error surface to translate them.
- [x] `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add `"avatarUrl": { "type": "string" }` to store the provider avatar URL (distinct from the media `avatar` relation).
- [x] `apps/strapi/src/bootstrap/social-providers.ts` (NEW) + `apps/strapi/src/index.ts` + `apps/strapi/.env.example` -- read the users-permissions `grant` plugin store, set `google` and `facebook` `enabled: true` (merging `key`/`secret`/`callback` from Strapi env when present), write it back idempotently; invoke `ensureSocialProviders({strapi})` from `bootstrap()`; document the optional Strapi grant vars + that functional OAuth creds live in the client app.
- [x] `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- add exported `fetchSocialProfile(provider,accessToken)` (Google userinfo / Facebook graph → `{email,name,avatarUrl}`) and a `TRUSTED_SOCIAL_PROVIDERS` set; wrap `plugin.controllers.auth.callback`: for trusted providers, fetch the profile + look up the email before delegating; if stock throws "Email is already taken", **link** by issuing a JWT for the existing user + sanitized user into `ctx.body`; after stock creates a brand-new account, persist `firstName`+`avatarUrl` via the user service and send a non-blocking localized welcome email. Non-trusted / `local` delegate unchanged.
- [x] `apps/strapi/src/extensions/users-permissions/social-login.unit.test.ts` (NEW) -- using the `register.unit.test.ts` harness pattern, cover the I/O matrix: new-user `firstName`/`avatarUrl` persistence + welcome email; repeat-login no-duplicate/no-re-email; cross-provider linking returns the existing account (provider not clobbered, no welcome email); welcome-email failure non-blocking; non-trusted provider passthrough.
- [x] `apps/client/src/app/[locale]/auth/signin/_components/SignInFormWithSocial.test.tsx` -- assert social buttons render when `enableGoogle`/`enableFacebook` and clicking invokes `signIn("google"|"facebook", { callbackUrl })` (mock `next-auth/react` `signIn`); assert hidden when both disabled.

**Acceptance Criteria:**

- Given the signin or register page with a provider configured, when the visitor taps "Continue with Google"/"Continue with Facebook", then they complete the provider OAuth handshake and return logged-in, redirected to the `callbackUrl` (default `/`), with the flow completing under 10 seconds (NFR-IN4).
- Given a visitor who previously registered with email/password, when they later sign in with Google using the same email, then they are signed into their existing account (no duplicate is created) and their password login continues to work.
- Given social providers are not configured in the environment, when a visitor opens the signin/register page, then the social buttons are hidden (no broken buttons) and email/password auth is unaffected.
- Given a brand-new social sign-up, when the account is created, then the user has role `authenticated`, `confirmed: true`, `firstName` from the provider, and receives a welcome email — and a welcome-email failure does not prevent login.

## Spec Change Log

_No `bad_spec` loopback occurred; the intent contract and spec sections were unchanged during review._

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 2, medium 4, low 1)
- defer: 6: (high 0, medium 1, low 5)
- reject: 3
- addressed_findings:
  - `[high]` `[patch]` The linking branch issued a JWT for a matching-email account without honoring an admin `blocked` flag (a social-path auth bypass the stock repeat-login path enforces) and trusted the stale pre-lookup. The catch now re-queries by email at catch time and refuses to link a `blocked` target — also fixing the concurrent first-login race (the loser now links instead of erroring).
  - `[high]` `[patch]` A repeat social login during a transient provider-profile-fetch failure wiped `firstName`/`avatarUrl` to null and re-sent the welcome email (enrichment keyed off the separately-fetched email). Enrichment is now gated on a resolved provider email, so a failed fetch skips it entirely — no data loss, no duplicate email.
  - `[medium]` `[patch]` Linking trusted the provider email without checking verification. `fetchSocialProfile` now returns `emailVerified` (Google `email_verified`; Facebook always-verified) and the link branch requires it, enforcing the story's own "verified email makes linking safe" premise and closing the account-takeover vector.
  - `[medium]` `[patch]` Enrichment and the welcome email shared one try/catch, so a profile-persist failure suppressed the email; split into two independent try/catch (mirrors 4.1), and the edit payload now omits null fields (no null overwrite on missing name/avatar).
  - `[medium]` `[patch]` `avatarUrl` was `string` (varchar 255) but Google/Facebook CDN picture URLs can exceed it (persist would throw); changed the schema attribute to `type: "text"`.
  - `[medium]` `[patch]` The OAuth-error toast re-fired on every render/visit (`session.error` is sticky in the JWT; `toast`/`tSocial` are unstable effect deps). Added a one-shot ref keyed on the error code in both the signin and register forms.
  - `[low]` `[patch]` Verification coverage: added backend tests (blocked-link denied, unverified-email no-link, repeat-login-with-failed-fetch no-overwrite/no-email, `fetchSocialProfile` fetch-throw + unknown-provider), a new `ensureSocialProviders` grant-store idempotency/merge unit test, RegisterForm social-button→`signIn` tests, and signin error-toast surfacing tests.

Deferred (2026-07-09): Strapi grant endpoints enabled unconditionally regardless of creds; redundant double provider-profile fetch per login; case-sensitive email lookup in the linking query; new social sign-ups always get a French welcome email (no locale threaded through the OAuth callback); `lib/auth.ts` env-gated provider registration untested; `avatarUrl` real-DB persistence only mock-asserted. Rejected as noise/design: the `different_provider` copy "contradicting" linking (it is an acceptable fallback when linking is refused/unavailable); the `code`/`oauth_token` token fallbacks (mirror stock precedence, degrade safely); and the absence of a returning-user-vs-new UX distinction on the register-page social buttons (by design — progressive account creation).

### 2026-07-09 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 3: (high 1, medium 2, low 0)
- reject: 13
- addressed_findings:
  - `[medium]` `[patch]` The `RegisterForm` OAuth-error `session.error` → toast effect (new this-story code, an exact copy of the tested `SignInFormWithSocial` effect) had NO running test: `RegisterForm.test.tsx` hardcoded `useSession → { data: null }` and an uncaptured `toast` mock, so the branch never executed and a regression (wrong key, broken one-shot ref, dropped effect) would ship green. Made the session/toast mocks capturable + mutable (mirroring the signin test) and added three cases — `different_provider` toasts once with the mapped `errors.*` description, no error → no toast, unrelated error (`invalid_strapi_token`) → no toast. Client suite now 210/210 (RegisterForm 15→18).

Deferred as NEW ledger entries (2026-07-09 follow-up): (1) Facebook `emailVerified` is derived as `Boolean(data.email)` — the Graph API `email` is not guaranteed provider-verified, so the linking branch could sign an attacker into an existing local/Google account with the same email (account-takeover vector; flagged high by two independent reviewers). This stems from the explicit intent-contract premise "Google and Facebook both return verified emails," so it is escalated for human/product re-validation rather than silently patched against the frozen intent. (2) The linking branch guards `!linkTarget.blocked` but not `linkTarget.confirmed`, dropping a gate stock repeat-login enforces (zero impact today with `email_confirmation:false`; and a provider-verified email is arguably stronger than pending email-confirmation — so the "correct" behavior needs product judgment, not a reflexive one-liner). (3) `fetchSocialProfile` uses bare `fetch` with no timeout/AbortController, so a hung Google/Facebook endpoint can stall the auth request past NFR-IN4's <10s (bundle with the already-deferred fetch-restructuring). Rejected as noise/by-design/convention: the bootstrap `throw error` on grant-store failure (matches the sibling `ensureI18nLocales` fail-fast convention verbatim); unguarded sanitize/jwt.issue inside the link catch (defensive, near-zero probability); strict `email_verified === true` for Google (userinfo v3 returns a boolean — string case is speculative); array/`code`/`oauth_token` token coercions (degrade safely — already-rejected precedent); one-shot toast suppressing a second identical error (accepted design); full display name in `firstName` (consistent field usage); re-enabling providers every boot (part of the idempotent-to-enabled design); transient/unvalidated `avatarUrl` (Story 4.4's media-reconciliation scope per intent); stuck loading spinner if `signIn` resolves without redirect (OAuth `signIn` redirects); duplicated toast effect across both forms (works — DRY refactor nicety); concurrent-first-login duplicate welcome email (DB `unique_email` means only one create wins, the other links); and `ensureSocialProviders` bootstrap-wiring untested (typical boot wiring).

## Design Notes

Stock v5.33.1: `GET /auth/:provider/callback` is a JSON endpoint (`ctx.send({jwt,user})`, not a redirect) that reads the token from `ctx.query.access_token`, gates on the grant store `enabled` flag, and in `providers.connect` throws `Email is already taken` for a same-email/different-provider login (`unique_email` default). The Google/Facebook stock profile is only `{username,email}` — hence we fetch name+avatar ourselves.

Callback wrap (extend the existing `export default (plugin) => {…}`, keeping the register override):

```ts
const TRUSTED = new Set(["google", "facebook"])
const originalCallback = plugin.controllers.auth.callback
plugin.controllers.auth.callback = async (ctx) => {
  const provider = ctx.params.provider || "local"
  if (!TRUSTED.has(provider)) return originalCallback(ctx)
  const token =
    ctx.query.access_token || ctx.query.code || ctx.query.oauth_token
  const profile = await fetchSocialProfile(provider, token) // {email,name,avatarUrl}
  const email = String(profile.email || "").toLowerCase()
  const userSvc = strapi.plugin("users-permissions").service("user")
  const pre =
    email &&
    (await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email } }))
  try {
    await originalCallback(ctx) // create OR repeat-login → ctx.body={jwt,user}
  } catch (err) {
    if (pre && /already taken/i.test(err.message)) {
      // LINK, don't duplicate
      ctx.body = {
        jwt: strapi
          .plugin("users-permissions")
          .service("jwt")
          .issue({ id: pre.id }),
        user: await sanitizeOutputUser(pre, ctx),
      }
      return
    }
    throw err
  }
  if (!pre && ctx.body?.user) {
    // brand-new account only
    try {
      await userSvc.edit(ctx.body.user.id, {
        firstName: profile.name,
        avatarUrl: profile.avatarUrl,
      })
      await sendWelcomeEmail({ ...ctx.body.user, firstName: profile.name })
    } catch (e) {
      strapi.log.error("[social-login] enrich/welcome failed", e)
    }
  }
}
```

`fetchSocialProfile` uses Node 22 global `fetch`: Google `GET https://www.googleapis.com/oauth2/v3/userinfo` (Bearer token → `{email,name,picture}`), Facebook `GET https://graph.facebook.com/me?fields=name,email,picture&access_token=…` (`picture.data.url`). Bootstrap grant seed reads/merges the `grant` plugin store entry and writes `enabled:true` for both providers (idempotent; app `bootstrap()` runs after the plugin's own `initGrant`).

## Verification

**Commands:**

- `cd apps/client && yarn type-check` -- expected: no new type errors in touched files
- `cd apps/client && yarn lint` -- expected: clean on touched files
- `cd apps/client && yarn test` -- expected: `SignInFormWithSocial` social-button/`signIn` tests pass
- `cd apps/strapi && yarn test` -- expected: unit gate green including `social-login.unit.test.ts` (linking, new-user enrichment + welcome email, non-blocking, passthrough)

**Manual checks (if no CLI):**

- With `GOOGLE_CLIENT_ID/SECRET` set, click "Continue with Google" → land logged-in on the intended destination; a Strapi user appears with `provider:google`, `firstName`, `avatarUrl`, `confirmed:true`; welcome email logged (Brevo key unset) or delivered.
- Register locally with email `x@y.z`, then sign in with Google as `x@y.z` → the SAME account is used (no second row); email/password login for `x@y.z` still works.

## Auto Run Result

Status: done

**Summary:** Wired Google/Facebook social login end to end on top of the pre-existing NextAuth ↔ Strapi OAuth scaffolding. Frontend: registered `GoogleProvider`/`FacebookProvider` in `lib/auth.ts` (gated on env creds), surfaced the reused `SocialLogin` buttons on the signin (`SignInFormWithSocial`) and register pages calling `signIn(provider,{callbackUrl})`, and added translated surfacing of the NextAuth `oauth_error`/`different_provider` session errors. Backend: a versioned bootstrap (`ensureSocialProviders`) enables the providers in the users-permissions `grant` store (stock gates the callback on it), and the `strapi-server.ts` extension wraps `controllers.auth.callback` so a matching provider-verified email is LINKED to the existing account (not duplicated, `provider` not clobbered, `blocked` honored) and a brand-new social account gets `firstName`+`avatarUrl` from the provider plus a non-blocking localized welcome email.

**Files changed:**

- `apps/client/src/lib/auth.ts` -- register Google/Facebook providers only when their `*_CLIENT_ID`+`*_CLIENT_SECRET` env are set (jwt/session OAuth exchange untouched).
- `apps/client/src/app/[locale]/auth/signin/page.tsx` + `_components/SignInFormWithSocial.tsx` -- render the social form with env-derived enable flags; one-shot translated toast for `session.error`.
- `apps/client/src/app/[locale]/auth/register/page.tsx` + `_components/RegisterForm.tsx` -- social buttons wired to `signIn(provider,{callbackUrl})`, gated on enable flags; same error surfacing.
- `apps/client/locales/{en,fr,ar}.json` -- `auth.social.errors.{oauth_error,different_provider}` (Western numerals in Arabic).
- `apps/client/.env.local.example` + `apps/strapi/.env.example` -- OAuth env vars documented (functional creds live in the client app).
- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- exported `fetchSocialProfile` (Google userinfo / Facebook graph, returns `emailVerified`) + `TRUSTED_SOCIAL_PROVIDERS`; `controllers.auth.callback` wrap (verified-email linking with `blocked` guard + catch-time re-query; new-account enrichment + non-blocking welcome email in split try/catch).
- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- new `avatarUrl` (`text`).
- `apps/strapi/src/bootstrap/social-providers.ts` (new) + `apps/strapi/src/index.ts` -- idempotent grant-store enablement for google/facebook.
- Tests (new/updated): `apps/strapi/src/extensions/users-permissions/social-login.unit.test.ts`, `apps/strapi/src/bootstrap/social-providers.unit.test.ts`, `apps/client/.../signin/_components/SignInFormWithSocial.test.tsx`, `apps/client/.../register/_components/RegisterForm.test.tsx`, `apps/client/vitest.config.ts`.

**Review findings:** 7 patches applied (2 high, 4 medium, 1 low — blocked-user link bypass + concurrent-race, repeat-login data-loss on fetch failure, `email_verified` enforcement, split enrichment/email try-catch, `avatarUrl` string→text, toast re-fire, added test coverage); 6 deferred (1 medium, 5 low); 3 rejected as noise/design. No `intent_gap`, no `bad_spec` — no spec loopback.

**Verification:** client `yarn typecheck` — 0 new errors in touched files (pre-existing baseline only); client `yarn lint` — clean on touched files; client `yarn test` — 207/207 (13 files); Strapi `yarn test` — 135/135 (11 unit suites); Strapi `tsc --noEmit` — clean in touched files. Follow-up independent review recommended (`followup_review_recommended: true`) given the security/data-behavior breadth of the review patches (2 high + 4 medium touching auth linking, verification, and persistence).

**Residual risks:** Deliverability of the welcome email is unverified without `BREVO_API_KEY` (console fallback). No integration/boot test exercises the real Strapi callback response shape or `avatarUrl` DB persistence (mock-only, deferred). New social sign-ups get a French welcome email until locale is threaded through the OAuth callback (deferred). The Strapi `/auth/:provider/callback` is enabled in all environments regardless of client cred presence (deferred — low risk now that linking enforces `email_verified`). Email casing in the linking lookup assumes lowercase-stored emails (deferred, consistent with 4.1).

---

## Auto Run Result — Follow-up Review (2026-07-09)

Status: done

Independent follow-up review pass (Blind Hunter + Edge Case Hunter + Verification Gap Reviewer, run in parallel at session model capability) on the committed 4.2 diff.

**Triage:** 0 intent_gap, 0 bad_spec, 1 patch, 3 new defers, 13 rejects. Six of the surfaced findings were already tracked from the first 4.2 pass (unconditional grant enablement, double provider-fetch, case-sensitive linking lookup, French welcome email, `lib/auth`/page-gating test gap, `avatarUrl` mock-only persistence) and were not re-added.

**Patch applied (1, test-only):** Added the missing `RegisterForm` OAuth-error toast tests. The `session.error` → toast effect is an exact copy of the already-tested `SignInFormWithSocial` effect, but `RegisterForm.test.tsx` hardcoded `useSession → { data: null }` and an uncaptured toast mock, so the branch never ran. Made the mocks capturable/mutable and added `different_provider` (toasts once, mapped description), no-error, and unrelated-error cases. Client suite 207→210 (RegisterForm 15→18). Committed as `69346cc`.

**Deferred (3 NEW ledger entries):** (1) HIGH — Facebook `emailVerified: Boolean(data.email)` is a potential account-takeover vector (Graph API email not guaranteed provider-verified); escalated for human/product re-validation because it stems from the explicit intent-contract "Facebook returns verified emails" premise and cannot be safely patched against the frozen intent. (2) MEDIUM — the linking branch checks `!blocked` but not `confirmed` (zero impact today with confirmation off; "correct" behavior is ambiguous since a provider-verified email arguably exceeds pending email-confirmation → needs product judgment). (3) MEDIUM — `fetchSocialProfile` has no fetch timeout, so a hung provider can stall the auth request past NFR-IN4 (bundle with the deferred fetch-restructuring).

**Rejected (13):** bootstrap `throw` on grant-store failure (matches the sibling `ensureI18nLocales` fail-fast convention), unguarded sanitize/jwt.issue in the link catch (defensive/near-zero probability), strict Google `email_verified === true` (userinfo v3 returns a boolean), array/`code`/`oauth_token` token coercions (degrade safely), one-shot toast suppressing a second identical error (accepted design), full display name in `firstName` (consistent field usage), re-enabling providers every boot (idempotent-to-enabled design), transient/unvalidated `avatarUrl` (Story 4.4 scope), stuck spinner if `signIn` resolves without redirect (OAuth `signIn` redirects), duplicated toast effect (DRY nicety), concurrent-first-login duplicate email (DB `unique_email` — only one create wins), and `ensureSocialProviders` boot-wiring untested (typical boot wiring).

**Verification:** client `yarn test` — 210/210 (13 files); `eslint` on the touched test file — clean. No production code changed this pass.

**Follow-up review recommendation:** `false` — the pass produced a single localized, test-only patch; no production behavior changed, so an independent follow-up would add no value.
