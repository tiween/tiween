---
title: "Password Reset Flow"
type: "feature"
created: "2026-07-09"
status: "done"
baseline_revision: "4ef2c9297c0bb877ebeb40e183c049cc9c443e5a"
final_revision: "2bad2b2644c8977c2fcb97ac4251c48ba383d284"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** A user who forgets their password has no way to regain access. Story 4.3 requires a self-service reset: request a link by email, set a new password via a secure time-limited link, get auto-logged-in, and have all pre-existing sessions invalidated so a compromised/old session cannot survive the reset.

**Approach:** Wrap Strapi's stock `forgotPassword`/`resetPassword` controllers in the existing `users-permissions` extension to send localized (AR/FR/EN) reset emails with a `CLIENT`-hosted, time-limited, single-use link, enforce the project password policy, and stamp a `passwordChangedAt` boundary. A small global middleware rejects any JWT issued before that boundary, realizing session invalidation on the stateless-JWT architecture. Finalize the already-scaffolded frontend reset page with a dedicated form (strength meter, policy parity) and auto-login.

## Boundaries & Constraints

**Always:**

- Backend returns stable error CODES (`RESET_TOKEN_INVALID`, `RESET_TOKEN_EXPIRED`, plus the shared `validate` password-policy codes), never prose; the client translates via next-intl.
- `forgotPassword` responds `{ ok: true }` for BOTH existing and non-existing emails (no account-existence leak); email-send failure is logged, still returns `{ ok: true }`.
- Reset link is single-use (stock clears `resetPasswordToken` on success) AND time-limited (`resetPasswordTokenExpiresAt`, default TTL 1h).
- New-password validation enforces the project policy (min 8, upper, lower, digit) on BOTH client and server, reusing existing constants/schema — never weaker on the server.
- Reset issues a fresh JWT; `passwordChangedAt` is set to that JWT's `iat` so the new session survives and every older JWT for the user is rejected.
- The stale-JWT middleware is a strict no-op when `ctx.state.user.passwordChangedAt` is unset and on decode error (fail-open — the request already passed users-permissions auth), so it never locks out un-reset users.
- Reuse existing pieces: `sendWelcomeEmail`'s email-send mechanism, `validate`/`registerSchema` password rules, `PasswordStrengthIndicator`, password constants, `forgotPasswordMutation`/`resetPasswordMutation`, the `strapi-server.ts` wrap pattern, and the `?code=&email=` link convention from `lifeCycles/user.ts`.

**Block If:**

- Adopting session invalidation would require introducing Redis or a token deny-list store (out of the stateless-JWT design) rather than the `passwordChangedAt` boundary approach.
- The activation flow (`SetPasswordForm` → `/auth/reset-password`, tokens minted by `lifeCycles/user.ts` without an expiry) would REGRESS under the new expiry/`passwordChangedAt` logic.

**Never:**

- Do not build a rate-limiting subsystem in this story — no prior Epic-4 story shipped one; it is an epic-wide NFR deferred to a dedicated hardening story (record in deferred-work).
- Do not store or log plaintext passwords or reset tokens; do not expose reset tokens in API responses.
- Do not modify the register override or social callback wrap; do not touch guest/profile scope (4.4–4.6).
- Do not add Arabic-Indic numerals; Western numerals in all locales.

## I/O & Edge-Case Matrix

| Scenario                           | Input / State                                                                     | Expected Output / Behavior                                                                                                                   | Error Handling                                    |
| ---------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Forgot — known email               | `POST /auth/forgot-password {email}`, user exists                                 | `resetPasswordToken` + `resetPasswordTokenExpiresAt=now+TTL` persisted; localized reset email sent with `?code=&email=` link; `{ ok: true }` | No error expected                                 |
| Forgot — unknown email             | same, no user                                                                     | `{ ok: true }`, no email sent, no leak                                                                                                       | No error expected                                 |
| Forgot — email send fails          | provider throws                                                                   | `strapi.log.error`, still `{ ok: true }`                                                                                                     | Swallow, log                                      |
| Reset — valid, in-policy           | `POST /auth/reset-password {code,password,passwordConfirmation}`, token unexpired | password hashed (stock); `passwordChangedAt=newJWT.iat`; expiry cleared; `{ jwt, user }`                                                     | No error expected                                 |
| Reset — expired token              | expiry in the past                                                                | reject before delegating                                                                                                                     | `RESET_TOKEN_EXPIRED` (400)                       |
| Reset — unknown/used token         | no user matches code                                                              | stock 400 mapped                                                                                                                             | `RESET_TOKEN_INVALID`                             |
| Reset — weak password              | fails policy                                                                      | reject before delegating                                                                                                                     | shared `validate` code (e.g. `PASSWORD_TOO_WEAK`) |
| Authed request, stale JWT          | `iat < user.passwordChangedAt`                                                    | request rejected                                                                                                                             | 401 `TOKEN_REVOKED`                               |
| Authed request, fresh/no-reset JWT | `iat >= passwordChangedAt` or field unset                                         | pass through                                                                                                                                 | No error expected                                 |

</intent-contract>

## Code Map

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` -- add `plugin.controllers.auth.forgotPassword` + `.resetPassword` wraps (mirror the register/callback capture-and-reassign pattern, L274-427); add exported `buildResetPasswordEmail(locale,name,url)` (mirror `buildWelcomeEmail` L80-102) + `sendPasswordResetEmail(user,url,requestLocale?)` (mirror `sendWelcomeEmail` L127-148, same `strapi.plugins.email.services.email.send`); reuse `normalizeLocale`, `escapeHtml`, `sanitizeOutputUser`, and `validate(registerSchema-password-rules,…)`.
- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add `passwordChangedAt` (datetime, `private:true`, `configurable:false`) and `resetPasswordTokenExpiresAt` (datetime, `private:true`, `configurable:false`); `resetPasswordToken`/`preferredLanguage`/`firstName`/`blocked` already exist.
- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (session-invalidation hook) -- wrap the users-permissions `jwt` **service** factory (`plugin.services.jwt`) so the returned instance's `verify(token)` ALSO rejects stale tokens: after the original verify resolves `{id,iat}`, look up the user's `passwordChangedAt` and throw `Error("Invalid token.")` when `iat < floor(passwordChangedAt/1000)`. This runs inside the users-permissions auth strategy (`node_modules/@strapi/plugin-users-permissions/.../strategies/users-permissions.js` → `getService('jwt').getToken` → `verify`) on EVERY authenticated request, so a stale JWT is rejected with a standard 401 across all endpoints. NOT a global middleware — a `config/middlewares.ts` global runs its pre-`next()` code before authentication populates `ctx.state.user`, so that approach is inert. No new middleware file; `config/middlewares.ts` stays stock.
- `apps/strapi/.env.example` -- add `CLIENT_RESET_PASSWORD_URL` (mirrors existing `CLIENT_ACCOUNT_ACTIVATION_URL`, L129-137) and `RESET_TOKEN_TTL_MS` (default 3600000; treated as invalid when not a finite number `> 0`).
- `apps/strapi/src/extensions/users-permissions/password-reset.unit.test.ts` (NEW, **Jest**) -- follow the `register.unit.test.ts` / `social-login.unit.test.ts` `buildHarness()` mock-`strapi` pattern; cover the I/O matrix incl. the middleware.
- `apps/client/src/app/[locale]/auth/reset-password/page.tsx` -- remove `removeThisWhenYouNeedMe` placeholder; read `code` + `email` from the RSC `searchParams` prop, NORMALIZING array values (duplicated query params) to their first element before passing to the client form; render the new `ResetPasswordForm` (not `SetPasswordForm`).
- `apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.tsx` (NEW) -- reuse `PasswordStrengthIndicator` + `lib/constants` policy + `useUserMutations().resetPasswordMutation`; on success `signIn("credentials",{email,password,redirect:false})` then redirect (mirror `RegisterForm.tsx` L136-161). Constrain the post-login redirect target: accept `callbackUrl` only when it is a same-origin relative path (starts with `/` and not `//`), else fall back to `/`.
- `apps/client/src/app/[locale]/auth/forgot-password/_components/ForgotPasswordForm.tsx` -- ensure success surface is the no-leak "if an account exists…" copy (`auth.forgotPassword.passwordChangeEmailSent`) shown regardless of backend result.
- `apps/client/locales/{en,fr,ar}.json` -- add missing `auth.resetPassword.*` (error codes `RESET_TOKEN_INVALID`/`RESET_TOKEN_EXPIRED`, strength labels reused from register) and confirm `auth.forgotPassword.*`.
- `apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.test.tsx` (NEW) + `apps/client/src/app/[locale]/auth/forgot-password/_components/ForgotPasswordForm.test.tsx` (NEW) -- vitest; mirror `RegisterForm.test.tsx` mocking (`useUser` mutate spy, `next-auth/react` `signIn`, `next-intl`, `next/navigation`). MUST include a success case where `signIn` resolves `{ ok: true }` and assert the redirect target (default `/`, and a same-origin `callbackUrl` honored while an off-origin one is rejected).

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` -- add `passwordChangedAt` and `resetPasswordTokenExpiresAt` datetime fields (`private:true`, `configurable:false`).
- [x] `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (forgot/reset wraps) -- wrap `forgotPassword` (find user by email; SKIP silently when `user.blocked` — still `{ok:true}`, no email; otherwise generate token via `crypto.randomBytes`, persist `resetPasswordToken` + `resetPasswordTokenExpiresAt=now+ttl` where `ttl` = `RESET_TOKEN_TTL_MS` only when it parses to a finite number `> 0`, else the 1h default; build the `CLIENT_RESET_PASSWORD_URL?code=&email=` link, send localized email; ALWAYS return `{ok:true}`, swallow+log send errors) and `resetPassword` (find user by `code`; reject when `resetPasswordTokenExpiresAt` set AND `Date.now() >= expiresAt` → `RESET_TOKEN_EXPIRED`; `validate` new password policy; delegate to stock for hash + token clear + jwt issue; map stock rejection → `RESET_TOKEN_INVALID`; then stamp `passwordChangedAt = new Date(iat*1000)` from the freshly issued JWT's `iat`, clearing `resetPasswordTokenExpiresAt` — if the issued body has no numeric `iat`, LOG and skip stamping rather than defaulting to `new Date()` which would self-revoke the fresh session); add exported `buildResetPasswordEmail` + `sendPasswordResetEmail`. Do not touch register/callback.
- [x] `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (session-invalidation) -- wrap the `plugin.services.jwt` factory so the returned instance's `verify(token)` ALSO rejects stale tokens: after the original verify resolves, when the payload has numeric `iat` and an `id`, look up the user's `passwordChangedAt` and throw `Error("Invalid token.")` when `iat < Math.floor(new Date(passwordChangedAt).getTime()/1000)`; strict no-op when `passwordChangedAt` is unset, the payload lacks `iat`/`id`, or the lookup throws. Rejection surfaces as a standard 401 via the users-permissions auth strategy. Do NOT add a global middleware and do NOT edit `config/middlewares.ts`.
- [x] `apps/strapi/.env.example` -- add `CLIENT_RESET_PASSWORD_URL` and `RESET_TOKEN_TTL_MS` with placeholder/default + comments.
- [x] `apps/strapi/src/extensions/users-permissions/password-reset.unit.test.ts` (NEW, Jest) -- cover every I/O matrix row: no-leak on unknown email, blocked-user skip (no token, no email, `{ok:true}`), non-blocking send failure, TTL `<=0`/malformed → default, expiry rejection (incl. exact-`==` boundary rejected) and activation-no-expiry passthrough, weak-password rejection, `passwordChangedAt` stamping from issued `iat` (and no-`iat` skip), and the wrapped `jwt.verify` stale (throws) / fresh-same-second (passes) / unset (passes) cases.
- [x] `apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.tsx` (NEW) -- policy-enforcing form with strength meter, calling `resetPasswordMutation` then auto-login via `signIn("credentials",…)`; constrain the redirect to a same-origin relative `callbackUrl` (else `/`); map backend error codes to `auth.resetPassword.errors.*` messages using literal i18n keys.
- [x] `apps/client/src/app/[locale]/auth/reset-password/page.tsx` -- remove placeholder; read `code`+`email` from the RSC `searchParams` prop, normalizing array (duplicated) params to the first element; render `ResetPasswordForm`; handle missing `code` gracefully.
- [x] `apps/client/src/app/[locale]/auth/forgot-password/_components/ForgotPasswordForm.tsx` -- confirm no-leak success copy is always shown on submit success.
- [x] `apps/client/locales/en.json`, `fr.json`, `ar.json` -- add missing `auth.resetPassword.*` error/strength keys (Western numerals in Arabic).
- [x] `apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.test.tsx` (NEW) + `.../forgot-password/_components/ForgotPasswordForm.test.tsx` (NEW) -- vitest; assert payloads, policy validation, error-code mapping, and BOTH auto-login branches: `signIn` `{ok:true}` → redirect to `callbackUrl` (default `/`, off-origin rejected) and `{ok:false}` → fallback to signin.

**Acceptance Criteria:**

- Given a user on the signin page taps "Forgot password" and submits their email, when an account exists, then a localized, single-use, time-limited reset email is sent within ~2 minutes; when it does not, the same success message is shown and no email is sent (no account-existence leak).
- Given a valid, unexpired reset link, when the user submits a policy-compliant new password with matching confirmation, then their password is updated, they are automatically logged in, and they are redirected to their destination/homepage.
- Given a user completes a password reset, when any session/JWT that existed before the reset is used against an authenticated Strapi endpoint, then authentication fails with a standard 401 (the wrapped `jwt.verify` throws for a token whose `iat` predates `passwordChangedAt`) while the freshly issued session continues to work.
- Given an expired or already-used reset link, when the user submits, then the reset is refused with a translated `RESET_TOKEN_EXPIRED`/`RESET_TOKEN_INVALID` message and no password change occurs.
- Given the account-activation flow (which reuses `/auth/reset-password` with lifecycle-minted tokens that carry no expiry), when a user activates, then behavior is unchanged (expiry enforced only when `resetPasswordTokenExpiresAt` is set).

## Spec Change Log

### 2026-07-09 — bad_spec loopback (review pass 1)

- **Triggering finding:** All three reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) independently found the prescribed session-invalidation mechanism inert. The spec's Code Map/Tasks/Design Notes specified a `config/middlewares.ts` global middleware reading `ctx.state.user.passwordChangedAt` before `await next()`. In Strapi v5 a global middleware's pre-`next()` code runs BEFORE the users-permissions auth strategy populates `ctx.state.user`, so `passwordChangedAt` is always undefined at that point → no stale JWT is ever rejected. Acceptance Criterion "old sessions are invalidated" was fully unmet in production, while the unit test passed by injecting `ctx.state.user` by hand.
- **Amended:** Replaced the middleware mechanism (Code Map, Tasks, Design Notes, AC) with a wrap of the users-permissions `jwt` **service** `verify` (the strategy's real per-request auth call: `getToken → verify`), which enforces the `iat < passwordChangedAt` boundary universally and surfaces as a standard 401. Removed the `session-invalidation.ts` middleware file and its `config/middlewares.ts` registration from scope. Folded in review-surfaced hardening: skip `blocked` users in `forgotPassword`; robust `passwordChangedAt` stamping (second-granularity, skip when issued `iat` missing rather than self-revoking); TTL `>0` guard; expiry `>=` boundary; reset-page array-param normalization; reset-form same-origin `callbackUrl` guard; and a mandatory success-branch (`signIn {ok:true}`) redirect test.
- **Known-bad avoided:** a security feature (session invalidation) shipping green-but-inert; a `new Date()` stamping fallback that self-revokes the fresh auto-login session; blocked accounts regaining access via reset.
- **KEEP (must survive re-derivation):** forgot-password neutral `{ok:true}` (no enumeration by content), own `randomBytes(64)` token + expiry, localized AR/FR/EN email via `buildResetPasswordEmail` + the email plugin service, `CLIENT_RESET_PASSWORD_URL?code=&email=` link, swallow+log send errors, CLIENT-URL-unset warns; reset expiry enforced ONLY when `resetPasswordTokenExpiresAt` set (activation flow unaffected), server password policy via `validate(resetPasswordSchema,…)`, stock error → `RESET_TOKEN_INVALID`; the two new private datetime schema fields; ResetPasswordForm strength meter (capped when hard policy unmet), auto-login with email from link + manual-signin fallback, invalid-link card, literal-key i18n error mapping (the next-intl typed-key fix); ForgotPasswordForm always-neutral copy; Jest `buildHarness` + vitest RegisterForm-mirrored test patterns.

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 1: (high 1, medium 0, low 0)
- patch: 0
- defer: 4: (high 0, medium 1, low 3)
- reject: 2
- addressed_findings:
  - `[high]` `[bad_spec]` Session-invalidation was architecturally inert — a global pre-`next()` middleware cannot read the authenticated user. Spec amended to enforce via a `jwt.verify` service wrap in the users-permissions extension (the real per-request auth path); middleware removed. Folded review-surfaced hardening into the amended spec (blocked-user skip, robust `iat`-derived stamping, TTL/expiry boundary guards, array-param normalization, `callbackUrl` same-origin guard, success-redirect test). Code reverted for re-derivation.

### 2026-07-09 — Review pass (pass 2, post re-derivation)

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 2, low 4)
- defer: 2: (high 0, medium 0, low 2)
- reject: 3
- addressed_findings:
  - `[medium]` `[patch]` The `resetPassword` delegation `catch` mislabeled EVERY stock failure (transient DB / JWT-issue error, even after the password was already changed) as `RESET_TOKEN_INVALID`. Now only the stock "incorrect code" rejection maps to `RESET_TOKEN_INVALID`; other failures log the real cause and surface a distinct `RESET_FAILED` code (client → generic unexpected-error). Test added.
  - `[medium]` `[patch]` The `safeCallbackUrl` open-redirect guard (`startsWith("/") && !startsWith("//")`) missed backslash vectors (`/\evil.com`, which the URL parser normalizes to `//evil.com`). Tightened to `/^\/[^/\\]/`; the off-origin test now includes backslash cases.
  - `[low]` `[patch]` The wrapped `jwt.verify` boundary compared `iat < NaN` (always false → fail-open) when `passwordChangedAt` was unparseable. Added a `Number.isFinite(boundaryMs)` guard mirroring the expiry check; test added.
  - `[low]` `[patch]` `resetPassword` did not re-check `blocked` (only `forgotPassword` did). Added a blocked re-check → `RESET_TOKEN_INVALID` before delegating (defense-in-depth; login already rejects blocked). Test added.
  - `[low]` `[patch]` `RESET_TOKEN_TTL_MS` had no upper bound — a huge value overflowed `Date` to Invalid Date (non-expiring token). Capped at `8.64e15`.
  - `[low]` `[patch]` The `passwordChangedAt` stamp was skipped with no log when the stock body lacked `jwt`/`user.id`; added an else-branch log. Also added the happy-path test (future, non-null expiry delegates) that pins the expiry guard's non-throwing side, plus client weak-password / unexpected error-mapping tests.

Deferred (2026-07-09 pass 2): session-invalidation goes fully open under a future `jwtManagement:"refresh"` migration (no `iat` in that mode; safe today on legacy default); the verify wrap adds one PK user lookup per authenticated request (inherent to stateless-JWT revocation). Rejected as noise/by-design: the cosmetic mis-indentation in the jwt-wrap block (syntactically valid); the `signIn`-throws catch that only resets a loading flag (near-zero regression surface); the same-second `iat` window and the error-code e2e contract (already deferred in pass 1).

### 2026-07-09 — Review pass (follow-up review on `done` spec)

- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 1, low 2)
- defer: 1: (high 0, medium 0, low 1)
- reject: 8
- addressed_findings:
  - `[medium]` `[patch]` The `safeCallbackUrl` open-redirect guard `/^\/[^/\\]/` (added pass 2) still admitted ASCII control-char vectors: `[^/\\]` matches tab/newline/CR, so `/\n/evil.com` (`?callbackUrl=%0A%2Fevil.com`) passed, and the browser strips the control char during URL parsing, collapsing it to `//evil.com` → off-origin redirect after the authenticated auto-login. Added a `!/[ -]/` reject to the guard; the off-origin test now includes `/\t`, `/\n`, `/\r` vectors (all green).
  - `[low]` `[patch]` The `resetPassword` delegation-error classifier `/incorrect code|invalid/i` was broader than the pass-2 intent ("only the stock 'incorrect code' rejection → `RESET_TOKEN_INVALID`"): the `|invalid` alternative would mislabel any transient error whose message merely contains "invalid" as an invalid-link. Narrowed to `/incorrect code/i` (existing "Incorrect code provided" → `RESET_TOKEN_INVALID` and "Database connection lost" → `RESET_FAILED` tests stay green).
  - `[low]` `[patch]` The client error-mapping tests fed `mapErrorToKey` bare codes (`new Error("RESET_TOKEN_EXPIRED")`) rather than the JSON envelope `fetchAPI` actually throws (`new Error(JSON.stringify({message, details:{code}, …}))`), so a future tighten-to-equality regression would pass CI while breaking prod message mapping. Reworked the `RESET_TOKEN_EXPIRED` case to assert against the real envelope shape (still resolves `errors.RESET_TOKEN_EXPIRED` via substring match).

Deferred (2026-07-09 follow-up): the reset email ignores the active UI locale (client `forgotPasswordMutation` sends only `{email}`, so the server's `requestLocale` path is dead and language resolves via `preferredLanguage`, defaulting `fr`) — not a regression (email still localized by preference), fix is to forward the locale from the client mutation. Rejected as already-deferred or by-design/noise: the session-invalidation HTTP/integration-test gap and fail-open-on-DB-error (already deferred pass 1/2 residual + e2e contract entry); per-request DB lookup cost, refresh-mode latent no-op, same-second `iat` window, forgot-password timing enumeration, and repo-wide open-redirect on other auth forms (all already deferred); the array-`code` "guard bypass" (defused — stock `resetPassword` coerces `code` via `yup.string()` to the same string the wrapper computed, then does an equality `findOne`, so no `IN`-match and no expired/blocked reset completes); reset-token plaintext-at-rest (stock Strapi behavior, 512-bit entropy); password-confirmation-mismatch → `RESET_FAILED` (client-prevented, benign generic bucket); unparseable stored expiry fail-open (requires DB corruption; the happy path always writes a valid `Date`).

## Design Notes

Stateless-JWT session invalidation: stock `resetPassword` issues a new JWT and clears the single-use `resetPasswordToken`, but does nothing about already-issued access JWTs. We stamp `passwordChangedAt` to the new JWT's `iat` (so the boundary equals the surviving session) and enforce it inside the users-permissions **auth path**, not a global middleware. A `config/middlewares.ts` global runs its pre-`next()` code BEFORE authentication populates `ctx.state.user`, so it can never see the user — that approach is inert. The users-permissions strategy authenticates every request via `getService("jwt").getToken(ctx)` → `verify(token)` (returns `{id,iat,...}` in legacy JWT mode), so wrapping the `jwt` service's `verify` is the correct, universal enforcement point (a throw there becomes a standard 401):

```ts
// inside the (plugin) => {...} extension, alongside the controller wraps
const jwtFactory = plugin.services.jwt
plugin.services.jwt = (deps) => {
  const service = jwtFactory(deps)
  const originalVerify = service.verify.bind(service)
  service.verify = async (token) => {
    const payload = await originalVerify(token) // { id, iat, exp }
    const iat = payload?.iat
    if (payload?.id != null && typeof iat === "number") {
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: payload.id },
          select: ["id", "passwordChangedAt"],
        })
      if (user?.passwordChangedAt) {
        const boundarySec = Math.floor(
          new Date(user.passwordChangedAt).getTime() / 1000
        )
        if (iat < boundarySec) throw new Error("Invalid token.")
      }
    }
    return payload
  }
  return service
}
```

Because `getToken` calls `this.verify`, mutating the SAME service instance's `verify` is what makes the strategy pick it up. The reset wrap calls `verify(freshJwt)` BEFORE stamping `passwordChangedAt`, so the fresh token passes; every older-second token fails. Second-granularity comparison (`iat < floor(boundary/1000)`) keeps the just-issued auto-login token (same second → not `<`) alive. `blocked` users are skipped in `forgotPassword` so a reset can't restore access the admin revoked.

resetPassword wrap stamps the boundary from the freshly issued token so the auto-login session is never self-revoked:

```ts
await originalResetPassword(ctx) // stock: hash + clear token + ctx.body={jwt,user}
const { iat } = strapi
  .plugin("users-permissions")
  .service("jwt")
  .verify(ctx.body.jwt)
await userSvc.edit(ctx.body.user.id, {
  passwordChangedAt: new Date(iat * 1000),
  resetPasswordTokenExpiresAt: null,
})
```

Activation coupling: `lifeCycles/user.ts` mints `resetPasswordToken` for activation links WITHOUT an expiry. The reset wrap enforces expiry only when `resetPasswordTokenExpiresAt` is set, so activation (no expiry) is unaffected; both paths correctly stamp `passwordChangedAt` (harmless for activation).

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: unit gate green incl. `password-reset.unit.test.ts` (no-leak, expiry, weak-password, `passwordChangedAt` stamping, middleware stale/fresh/unset).
- `cd apps/strapi && yarn tsc --noEmit` (or the project's type-check) -- expected: no new type errors in touched files.
- `cd apps/client && yarn type-check` -- expected: no new type errors.
- `cd apps/client && yarn lint` -- expected: clean on touched files.
- `cd apps/client && yarn test` -- expected: `ResetPasswordForm`/`ForgotPasswordForm` tests pass (payloads, policy, error mapping, auto-login `signIn`).

**Manual checks (if no CLI):**

- Submit forgot-password for a known email → reset email logged (Brevo key unset) or delivered with a `CLIENT_RESET_PASSWORD_URL?code=…&email=…` link; submit for an unknown email → identical success UI, no email.
- Open the reset link, set a compliant new password → land logged-in; the pre-reset session's `/users/me` now returns 401.

## Auto Run Result

Status: done

**Summary:** Implemented Story 4.3 password reset end-to-end. Backend wraps the users-permissions `forgotPassword`/`resetPassword` controllers to send localized (AR/FR/EN) single-use, time-limited reset emails via Brevo with a `CLIENT_RESET_PASSWORD_URL?code=&email=` link, enforce the project password policy server-side, and never leak account existence (neutral `{ok:true}`, blocked-user skip). Stateless-JWT session invalidation is realized by stamping `passwordChangedAt` from the freshly issued JWT's `iat` and wrapping the users-permissions `jwt` **service** `verify` (the real per-request auth path) to reject any token issued before that boundary — a global middleware was proven inert and removed during review. Frontend finalizes the reset page (RSC reads `code`/`email` from `searchParams`, array-normalized) with a dedicated `ResetPasswordForm` (strength meter, policy parity, auto-login via NextAuth credentials, same-origin `callbackUrl` guard, code→i18n error mapping); forgot-password shows neutral copy.

**Files changed:**

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` — forgot/reset controller wraps, `buildResetPasswordEmail`/`sendPasswordResetEmail`, TTL resolver, and the `jwt` service `verify` wrap (session invalidation).
- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` — `passwordChangedAt` + `resetPasswordTokenExpiresAt` (private datetime).
- `apps/strapi/.env.example` — `CLIENT_RESET_PASSWORD_URL`, `RESET_TOKEN_TTL_MS`.
- `apps/strapi/src/extensions/users-permissions/password-reset.unit.test.ts` (NEW, Jest) — forgot/reset/verify I/O matrix + hardening cases.
- `apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.tsx` (NEW) + `.test.tsx` (NEW).
- `apps/client/src/app/[locale]/auth/reset-password/page.tsx` — placeholder removed; RSC searchParams wiring.
- `apps/client/src/app/[locale]/auth/forgot-password/_components/ForgotPasswordForm.tsx` (+ `.test.tsx` NEW) — always-neutral copy.
- `apps/client/locales/{en,fr,ar}.json` — `auth.resetPassword.*` keys (Western numerals in AR).
- `apps/client/vitest.config.ts` — include globs for the new auth tests.

**Review findings breakdown:**

- Pass 1: 1 `bad_spec` (high) — session-invalidation mechanism was inert (global middleware can't read the authenticated user pre-`next()`). Spec amended to the `jwt.verify` wrap; code reverted and re-derived. 4 deferred, 2 rejected.
- Pass 2: 6 patches applied (2 medium: reset-failure mislabeling, backslash open-redirect; 4 low: NaN fail-open guard, blocked re-check, TTL cap, stamp-skip log) with tests. 2 deferred (refresh-mode latent fail-open, per-request lookup cost), 3 rejected.

**Follow-up review recommended:** true — the story rebuilt a security-sensitive mechanism (session invalidation) through a `bad_spec` loopback and the final pass patched auth/open-redirect and revocation-robustness surface; an independent look is warranted despite full test coverage.

**Verification:**

- `cd apps/strapi && yarn type-check` → clean.
- `cd apps/strapi && yarn test` → 12 suites, 158 tests passing (incl. `password-reset.unit.test.ts`).
- `cd apps/client && yarn test` → 15 files, 228 tests passing.
- `cd apps/client && yarn typecheck` / `yarn lint` → zero new errors/warnings in touched auth files (pre-existing repo-wide errors in unrelated files remain out of scope).

**Residual risks:**

- Session invalidation depends on legacy JWT mode (has `iat`); a future `jwtManagement:"refresh"` migration would silently disable it (deferred).
- End-to-end enforcement (the users-permissions strategy actually invoking the wrapped `verify` on a live request) is asserted by inspection + unit tests, not an integration/boot test (the default gate is unit-only).
- Forgot-password retains a timing-based enumeration side channel and other auth forms retain the unguarded `callbackUrl` redirect (both deferred).

### Follow-up review (2026-07-09)

An independent follow-up review pass ran on the `done` spec (the prior pass recommended one). Three patches applied, all localized and test-covered:

- `[medium]` Closed a real open-redirect: the `safeCallbackUrl` guard `/^\/[^/\\]/` still admitted control-char vectors (`/\n/evil.com` → browser strips the newline → `//evil.com` off-origin). Added `!/[ -]/` and the `/\t`,`/\n`,`/\r` regression vectors to the off-origin test.
- `[low]` Narrowed the reset delegation-error classifier from `/incorrect code|invalid/i` to `/incorrect code/i` (the `|invalid` alternative over-mapped transient errors to `RESET_TOKEN_INVALID`), aligning with the pass-2 documented intent.
- `[low]` Hardened the client error-mapping test to assert against the real JSON error envelope `fetchAPI` throws, not a bare code (closes a silent-regression gap).

One new defer (reset email ignores active UI locale). Eight findings rejected (already-deferred residuals, spec-excluded rate-limiting, or defused/by-design — notably the array-`code` "bypass," which stock `yup.string()` coercion + equality `findOne` render inert). Verification re-run green: strapi 158 tests + `tsc` clean; client 228 tests + `tsc` no new errors (pre-existing unrelated errors in `content/server.ts`/`venues.ts` remain out of scope) + lint 0 errors. `followup_review_recommended: false` — the fixes are narrow and each now carries explicit regression coverage.
