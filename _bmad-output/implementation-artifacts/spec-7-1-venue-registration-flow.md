---
title: "Story 7.1: Venue Registration Flow"
type: "feature"
created: "2026-08-03"
status: "awaiting-operator"
baseline_revision: "4b6ce10"
final_revision: "2c7a3f3" # this line is recorded in the next commit
review_loop_iteration: 0
followup_review_recommended: true # 17 patches in one pass (3 high, 7 medium), three of which changed externally observable behaviour on an unauthenticated public write endpoint — a data-exposure gate on two public read routes, a rate-limit cap that would have thrown a platform-wide 429, and the first tests for the 285-line proxy that carries the entire client/server field contract
operator_actions:
  - "Provision a Brevo API key and set BREVO_API_KEY, BREVO_SENDER_EMAIL and BREVO_SENDER_NAME in every Strapi environment, and verify the sender address and its domain in the Brevo console — without this neither the applicant confirmation nor the admin notification is delivered."
  - "Set ADMIN_NOTIFICATION_EMAIL in every Strapi environment to the address that should receive new venue applications; while it is unset the admin notification is skipped with a log warning and no one learns an application arrived."
  - "Create a Strapi API token with create and delete permission on the Upload plugin and set it as STRAPI_REST_CUSTOM_API_KEY in the Next.js client environment — the route handler uploads and rolls back venue media with it, and now fails loudly rather than falling back to the read-only token."
  - "Register the production and staging domains for a reCAPTCHA v3 site in the Google reCAPTCHA console, then set RECAPTCHA_SECRET_KEY and NEXT_PUBLIC_RECAPTCHA_SITE_KEY together in the client environment — setting only the secret rejects every application with RECAPTCHA_REQUIRED."
  - "Confirm the 'Venue Manager' users-permissions role (type venue-manager) exists in every environment after boot; registration returns VENUE_MANAGER_ROLE_MISSING without it."
  - "Submit one real application in staging once the credentials above are in place, and confirm both emails arrive and the pending venue is invisible on the public venue endpoints — no path in this story has been exercised end to end."
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md"
  - "{project-root}/_bmad-output/project-context.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** A venue owner has no way to apply to Tiween. Nothing creates a pending venue, nothing creates a Venue Manager account, and no one is told an application arrived — venue onboarding is entirely manual, which blocks every other Epic 7 story from having a subject.

**Approach:** Add a public, unauthenticated venue-registration endpoint to the `venues` plugin that atomically provisions a blocked `venue-manager` user plus a `status: "pending"` venue linked as its `manager`, then fires a confirmation email to the applicant and a notification email to the platform admin address. Front it with a public Next.js registration page whose route handler rate-limits, verifies reCAPTCHA, uploads the logo/photos with the server API token, and forwards the application.

## Boundaries & Constraints

**Always:**

- New backend surface lives in `apps/strapi/src/plugins/venues` (hand-rolled factory controllers/services, Document Service API only, module-level UID constants, routes as `"controller.method"` strings).
- Zod validates every input on both sides; validation `message` strings are stable SCREAMING_SNAKE codes, never prose. Controller errors surface as `details.code`; the client translates.
- The created venue is `status: "pending"` and left **unpublished** (draft). The created user is `confirmed: true, blocked: true` — approval (unblock + publish + `status: "approved"`) is an admin action owned by the platform-administration epic.
- User creation goes through `strapi.plugins["users-permissions"].services.user.add(...)` (it hashes the password); the role is looked up by `type: "venue-manager"` (hyphen — `apps/strapi/src/bootstrap/venue-manager-role.ts` creates it; the seed script's `"venue_manager"` lookup is a known typo, do not copy it).
- If venue creation fails after the user was created, delete that user before rethrowing. There is no cross-store transaction; the compensating delete is the atomicity guarantee.
- Email sends never fail the request: each send is wrapped in its own try/catch that logs only. Email bodies are built by pure `build*Email(locale, …)` functions with `escapeHtml` on interpolated values and `sanitizeHeader` on subjects, mirroring `apps/strapi/src/plugins/user-engagement/server/src/services/notification-emails.ts`.
- Arabic copy uses Western numerals and DD/MM/YYYY (the `ar.json` numeral guard test must stay green).

**Block If:** (nothing — human-only external setup is recorded as operator actions, not a block)

**Never:**

- Do not touch `apps/strapi/src/extensions/users-permissions/strapi-server.ts`. Its auth overrides are assigned onto the controller _factory_ and are inert (story 4.7, still open); adding registration logic there inherits the dead-code trap.
- No admin approval UI, no venue profile editing, no permission grants for the `venue-manager` role, no Strapi-admin venue dashboard — those are 7.2+ / Epic 9.
- Do not enable the ImageKit upload provider or change `config/plugins.ts` upload settings.
- No new runtime dependencies; reuse `@/lib/rate-limit`, `@/lib/recaptcha`, `src/shared/validation.ts`.

## I/O & Edge-Case Matrix

| Scenario                            | Input / State                                                               | Expected Output / Behavior                                                                                            | Error Handling                                                         |
| ----------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Happy path                          | Valid payload, no user with that email                                      | Blocked `venue-manager` user + draft venue (`status: "pending"`, `manager` = user); 201 `{ venueDocumentId, status }` | None                                                                   |
| Duplicate applicant email           | Payload email matches an existing users-permissions user (case-insensitive) | 409, no user created, no venue created                                                                                | `details.code = "EMAIL_ALREADY_REGISTERED"`                            |
| Invalid payload                     | Missing `name`, bad email, unknown `type` enum, weak password               | 400, nothing created                                                                                                  | `details.code = "VALIDATION_FAILED"` + per-field SCREAMING_SNAKE codes |
| Venue Manager role absent           | `venue-manager` role missing from DB                                        | 500, no user created                                                                                                  | `details.code = "VENUE_MANAGER_ROLE_MISSING"`, logged                  |
| Venue create fails post-user        | Document Service `create` throws                                            | Created user is deleted; 500                                                                                          | `details.code = "VENUE_REGISTRATION_FAILED"`, original error logged    |
| Email provider down                 | Brevo send rejects for applicant and/or admin                               | Registration still succeeds with 201                                                                                  | Each failure logged via `strapi.log.error`, request unaffected         |
| Admin address unconfigured          | `ADMIN_NOTIFICATION_EMAIL` unset                                            | Registration succeeds; admin email skipped                                                                            | `strapi.log.warn` once per send attempt                                |
| Rate limit exceeded (route handler) | >5 submissions from one IP within 15 min                                    | 429 with `Retry-After`                                                                                                | `{ success: false, error: "RATE_LIMIT_EXCEEDED" }`                     |
| reCAPTCHA missing/invalid           | `RECAPTCHA_SECRET_KEY` set, token absent or score too low                   | 400, nothing forwarded to Strapi                                                                                      | `"RECAPTCHA_REQUIRED"` / `"RECAPTCHA_FAILED"`                          |
| Upload succeeds, register fails     | Files uploaded, Strapi registration returns non-2xx                         | Uploaded file ids deleted best-effort; error code relayed to client                                                   | Cleanup failure logged, original error still returned                  |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json` -- target model; already has `status` (enum, default `pending`), `manager` (→ users-permissions user), `logo`, `images`, `type`, contact fields. No schema change needed.
- `apps/strapi/src/plugins/venues/server/src/routes/index.ts` -- add the `POST /venues/register` content-api route (`auth: false` + rate-limit middleware). Ordering note in the file is load-bearing.
- `apps/strapi/src/plugins/venues/server/src/controllers/index.ts` -- hand-rolled factory controllers (`venue`, `seed`); add `registration`.
- `apps/strapi/src/plugins/venues/server/src/services/index.ts` -- service registry (`venue`, `public-api`, `seed`).
- `apps/strapi/src/plugins/venues/server/src/middlewares/index.ts` -- currently `export default {}`; the named-middleware pattern to copy is `apps/strapi/src/plugins/events-manager/server/src/middlewares/index.ts`.
- `apps/strapi/src/plugins/events-manager/server/src/middlewares/rate-limit.ts` -- `createRateLimit` implementation to promote into the shared kit.
- `apps/strapi/src/shared/validation.ts` -- `validate(schema, data)` → `ValidationError` with `details.code`.
- `apps/strapi/src/plugins/ticketing/server/src/controllers/order.ts` -- `STATUS_BY_CODE` + `respondError` envelope convention.
- `apps/strapi/src/plugins/user-engagement/server/src/services/notification-emails.ts` -- pure email-builder template (escapeHtml, sanitizeHeader, locale map).
- `apps/strapi/src/bootstrap/venue-manager-role.ts` -- creates the `venue-manager` role (permissions not seeded).
- `apps/strapi/config/plugins.ts` -- Brevo email provider config (`BREVO_*` env).
- `apps/client/src/app/api/contribute/play/route.ts` -- the public-submission route-handler pattern (rate limit → validate → reCAPTCHA → server-token fetch to Strapi).
- `apps/client/src/features/contribute/schemas/play-contribution.ts` -- error-CODE Zod schema convention.
- `apps/client/src/app/[locale]/auth/register/_components/RegisterForm.tsx` (+ `.test.tsx`) -- RHF + `AppForm`/`AppField` form skeleton and its test mocks.
- `apps/client/src/hooks/useUser.ts` -- `uploadAvatarMutation`, the `FormData` → `/api/upload` reference.
- `apps/client/src/lib/rate-limit.ts`, `apps/client/src/lib/recaptcha.ts` -- reusable limiter + verifier.
- `apps/client/vitest.config.ts` -- `test.include` is an explicit allowlist; new test paths must be added.
- `apps/client/locales/{en,fr,ar}.json` -- translation catalogs; `src/lib/icu-numerals.test.ts` guards Arabic numerals.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/shared/rate-limit.ts` -- move the `createRateLimit` implementation here verbatim and re-export it from `apps/strapi/src/plugins/events-manager/server/src/middlewares/rate-limit.ts` -- so the venues plugin reuses it without importing another plugin's internals, and events-manager tests keep passing unchanged.
- [x] `apps/strapi/src/plugins/venues/server/src/validation/registration.ts` -- add `venueRegistrationSchema` (venue: `name`, `description`, `address`, `type` enum, `phone`, `email`, optional `website`, optional `capacity`, optional `geo`, optional `logo` id, optional `images` ids; manager: `firstName`, `lastName`, `email`, `password`, optional `preferredLanguage`) with SCREAMING_SNAKE issue codes -- single source of truth for accepted input.
- [x] `apps/strapi/src/plugins/venues/server/src/services/registration-emails.ts` -- add pure `buildApplicantConfirmationEmail(locale, { applicantName, venueName })` and `buildAdminNotificationEmail({ venueName, contactEmail, applicantName, venueDocumentId })` returning `{ subject, html }`, fr/en/ar for the applicant, fr-only for the admin -- keeps templates unit-testable and injection-safe.
- [x] `apps/strapi/src/plugins/venues/server/src/services/registration.ts` -- add `registerVenue(input)` implementing the matrix: duplicate-email guard, role lookup, user creation, venue creation, compensating user delete, then the two non-blocking sends (admin recipient from `ADMIN_NOTIFICATION_EMAIL`) -- the whole flow in one auditable service.
- [x] `apps/strapi/src/plugins/venues/server/src/services/index.ts` -- register the `registration` service -- wiring.
- [x] `apps/strapi/src/plugins/venues/server/src/controllers/index.ts` -- add a `registration` controller whose `register` handler `validate()`s the body, calls the service, sets `ctx.status = 201`, and maps codes to statuses via a local `STATUS_BY_CODE` + `respondError` -- never leak internal exception text.
- [x] `apps/strapi/src/plugins/venues/server/src/middlewares/index.ts` -- export `"registration-rate-limit"` built from the shared `createRateLimit` (default 10/hour/IP) -- server-side backstop independent of the Next proxy.
- [x] `apps/strapi/src/plugins/venues/server/src/routes/index.ts` -- add `POST /venues/register` (`auth: false`, `policies: []`, `middlewares: [{ name: "plugin::venues.registration-rate-limit", config: {...} }]`) placed before `/venues/:documentId` -- avoid the literal segment being swallowed.
- [x] `apps/strapi/src/plugins/venues/server/src/services/__tests__/registration.unit.test.ts` -- cover every backend row of the I/O matrix with a mocked `strapi` (documents, `plugins["users-permissions"]`, `db.query`, `plugins.email`, `log`) -- these branches are otherwise unverifiable without a live DB.
- [x] `apps/strapi/src/plugins/venues/server/src/services/__tests__/registration-emails.unit.test.ts` -- assert locale fallback, HTML escaping of a `<script>`-bearing venue name, and CRLF stripping from subjects.
- [x] `apps/strapi/src/plugins/venues/server/src/controllers/__tests__/registration.unit.test.ts` -- assert 201 shape, code→status mapping, and that no raw error message reaches the response.
- [x] `apps/strapi/src/plugins/venues/server/src/routes/__tests__/routes.unit.test.ts` -- extend to assert the register route exists, is `auth: false`, carries the rate-limit middleware, and precedes `/venues/:documentId`.
- [x] `apps/strapi/.env.example` -- add an `ADMIN_NOTIFICATION_EMAIL=` entry near the `BREVO_*` block -- operators must know the knob exists.
- [x] `apps/client/src/features/venues/schemas/venue-registration.ts` -- mirror the backend Zod schema for client-side validation with the same error codes -- one vocabulary across the wire.
- [x] `apps/client/src/app/api/venues/register/route.ts` -- add the POST handler: `getClientIp` + a `venueRegistrationLimiter` (5 / 15 min), multipart parse, schema validation, `verifyRecaptcha`, upload `logo`/`images` to `${env.STRAPI_URL}/api/upload` with the server API token, forward to `${env.STRAPI_URL}/api/venues/register`, best-effort delete of uploaded ids on failure, relay `{ success, error }` -- keeps the API token server-side and matches the contribute precedent.
- [x] `apps/client/src/lib/rate-limit.ts` -- export `venueRegistrationLimiter` alongside `playSubmissionLimiter` -- limiter instances must be module-level so counters persist.
- [x] `apps/client/src/app/[locale]/venues/register/page.tsx` -- server page with `setRequestLocale` + `generateMetadata`, rendering the form -- public entry point.
- [x] `apps/client/src/app/[locale]/venues/register/_components/VenueRegistrationForm.tsx` -- client form using `AppForm`/`AppField`/`AppTextArea`/`AppSelect`, logo + photos pickers, reCAPTCHA token, submit to `/api/venues/register` as `FormData`, success panel ("application under review"), destructive toast mapping error codes via `t()` -- the AC's single submission surface.
- [x] `apps/client/locales/{en,fr,ar}.json` -- add the `venues.register` namespace (fields, placeholders, buttons, `errors` keyed by the SCREAMING_SNAKE codes, success copy) -- no hardcoded strings; Arabic must use Western numerals.
- [x] `apps/client/vitest.config.ts` -- extend `test.include` with the new venues globs -- otherwise the new tests silently never run.
- [x] `apps/client/src/features/venues/schemas/venue-registration.test.ts` and `apps/client/src/app/[locale]/venues/register/_components/VenueRegistrationForm.test.tsx` -- schema edge cases plus a render/validate/submit test mocking `@/lib/general-helpers`, `next-intl`, `@/lib/navigation`, `@/components/ui/use-toast`, and `fetch`.

**Acceptance Criteria:**

- Given a venue owner on `/venues/register`, when they submit a complete valid application, then a `venue-manager` user and a `pending` unpublished venue exist with the venue's `manager` pointing at that user, and the page shows an "under review" confirmation instead of the form.
- Given a successful registration, when the request completes, then exactly one applicant confirmation email and one admin notification email have been attempted, and neither outcome can change the 201 response.
- Given the created venue-manager account, when its owner attempts to sign in before approval, then authentication is refused because the user is `blocked` — the account exists but confers nothing until an admin approves it.
- Given the pending venue, when the public venue selector or listing is queried, then that venue does not appear. (The selector's `status: "approved"` filter already covers it; the review pass additionally pinned `GET /venues` and `GET /venues/:documentId` to `status: "published"`, since registration never publishes — see the Review Triage Log.)
- Given the full suite, when `yarn workspace @tiween/admin test`, `yarn workspace @tiween/client test`, both lints and both type-checks run, then all pass with zero warnings.

## Spec Change Log

_No bad_spec loopback occurred. Empty._

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 3, medium 7, low 7)
- defer: 6: (high 0, medium 4, low 2)
- reject: 4: (high 0, medium 1, low 3)
- addressed_findings:
  - `[high]` `[patch]` `GET /venues` and `GET /venues/:documentId` passed no `status` to the Document Service, which `defaultToDraft` resolves to **draft** — so every anonymously submitted venue (with the applicant's phone, email and address) became publicly readable the moment `registerVenue` returned. Both reads now pin `status: "published"`; registration never publishes. Gating on the `status` enum instead would have emptied the public listing, because seeded venues never set it (recorded as DW-211). Four tests pin the params.
  - `[high]` `[patch]` The `/api/venues/register` route handler — the whole client↔server field contract, upload sequencing, rollback and error relay — had no test; renaming `venueEmail` would have broken every registration with a green suite. Added `route.test.ts` (20 cases, node env) following the `contribute/play` precedent.
  - `[high]` `[patch]` The Strapi-side limiter was configured `10/hour` under a docstring claiming per-IP accumulation, but nothing sets `server.proxy` or populates `ctx.state.ip`, so all legitimate traffic shares the Next server's IP — the 11th registration platform-wide in an hour would have been rejected for everyone. Cap raised to 200/hour, docstring corrected to describe a global abuse backstop, route test given a floor assertion so it cannot be silently re-tightened.
  - `[medium]` `[patch]` Oversized, wrong-type and excess images were silently dropped and the request still returned 201 — a one-shot form losing the applicant's media behind a success message. Now rejected explicitly with `IMAGE_TOO_LARGE` / `IMAGE_TYPE_INVALID` / `IMAGES_TOO_MANY`, pre-checked client-side, translated in all three catalogs.
  - `[medium]` `[patch]` Both `website` schemas used `z.string().url()`, which accepts `ftp://`, `javascript:` and underscored hosts that the venues db lifecycle rejects — producing an unrecoverable opaque 500 after the manager account had already been created and rolled back. Both sides now use the canonical `WEBSITE_URL_PATTERN` from `src/shared/website-url.ts`.
  - `[medium]` `[patch]` A 429 from the Strapi backstop carries no error code, so the relay fell through to `VENUE_REGISTRATION_FAILED` ("please try again") and invited an immediately-throttled retry. Now mapped to `RATE_LIMIT_EXCEEDED`; the tautological `status === 429 ? 429 : status` expression removed.
  - `[medium]` `[patch]` `user.add` sat outside the try/catch, so a duplicate-email race or a `username` collision (the guard checked only `email`) surfaced as 500 `INTERNAL_ERROR` instead of the specified 409. Guard extended to `username`, `add` wrapped, unique-constraint violations mapped to `EMAIL_ALREADY_REGISTERED`.
  - `[medium]` `[patch]` `grecaptcha.execute` was called without awaiting `grecaptcha.ready` under a `lazyOnload` script, so an early submit produced an undefined token and a dead-end 400. Now awaited.
  - `[medium]` `[patch]` The controller collapsed unmapped errors to 500 with no `strapi.log` call and leaked `details.issues` for codes it had deliberately withheld. Both fixed, with tests asserting a mapped error is not logged and a withheld code's issues do not leak.
  - `[medium]` `[patch]` `RECAPTCHA_SECRET_KEY` set without `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` rejects 100% of applications. Behavior pinned by test and the pairing documented at the enforcement site; the operator obligation is recorded under `operator_actions`.
  - `[low]` `[patch]` Six localized cleanups: the venue-type select flipped uncontrolled→controlled (React warning in 7 of 11 tests); `serverApiKey()` degraded silently to the read-only token; `MAX_IMAGES` / the mime allowlist / `EMAIL_LOCALES` were duplicated across three modules; both password caps counted characters where bcrypt truncates at 72 bytes; a non-multipart body produced 500 instead of 400; and a 2xx with an empty body still rendered the "under review" panel.
  - `[low]` `[patch]` The form test mocked `@/lib/navigation`, a module the component never imports, and its four negative assertions resolved on the first tick — they would have stayed green with the submit handler deleted. Mock removed; each case now asserts a rendered validation message before asserting `fetch` was not called.

Deferred: DW-206 (`getClientIp` trusts the left-most XFF hop), DW-207 (uploads trusted on client-declared MIME alone), DW-208 (`verifyRecaptcha` ignores the token `action`), DW-209 (the two Zod schemas are hand-duplicated with nothing pinning them), DW-210 (`rateLimit()` leaks an uncleared interval and has no tests), DW-211 (seeded venues are `pending`, so the approved-only selector returns none of them).

Rejected: duplicate real-world venue submitted by two applicants (admin review is the intended gate); `normalizeLocale`'s `slice(0, 2)` aliasing (`preferredLanguage` is enum-constrained upstream); server-side `VALIDATION_FAILED` not mapped to per-field errors (the client mirrors the same schema, so it is unreachable in practice); the success panel offering no onward link (UX preference, not a defect).

## Design Notes

**Why a dedicated `POST /venues/register` instead of extending users-permissions `register`:** the extension file's overrides are assigned onto the upstream controller _factory_, so they never execute (story 4.7, unresolved). A plugin-owned route sidesteps that entirely and keeps venue-domain logic in the venues plugin per the architecture amendment.

**Why `blocked: true` rather than a separate approval flag:** users-permissions already refuses login for blocked users, so approval reduces to unblocking plus flipping `venue.status` — no new state machine, and no window where an unapproved manager can authenticate.

**Compensating delete, not a transaction:** the user lives in users-permissions and the venue in the Document Service; there is no shared transaction boundary. Order is user-then-venue so the only failure window leaves an orphan user, which is deletable by documentId/id:

```ts
const user = await upUserService.add({
  ...userInput,
  role: role.id,
  blocked: true,
})
try {
  venue = await strapi
    .documents(VENUE_UID)
    .create({ data: { ...venueInput, status: "pending", manager: user.id } })
} catch (err) {
  await strapi.plugins["users-permissions"].services.user.remove({
    id: user.id,
  })
  throw err
}
```

**Uploads before registration:** files must exist before the venue references them, so the route handler uploads first and deletes the ids best-effort if registration then fails. Orphaned media is the acceptable failure mode; a rejected application is not.

## Verification

**Commands:**

- `yarn workspace @tiween/admin test` -- expected: all Jest unit projects pass, including the four new/extended venues suites.
- `yarn workspace @tiween/admin lint` -- expected: exit 0 (`--max-warnings=0`).
- `yarn workspace @tiween/admin type-check` -- expected: exit 0.
- `yarn workspace @tiween/client test` -- expected: Vitest passes, and the new venues specs actually appear in the run output (proves the `test.include` glob landed).
- `yarn workspace @tiween/client lint` -- expected: exit 0.
- `yarn workspace @tiween/client typecheck` -- expected: exit 0.
- `yarn format:check` -- expected: exit 0.

**Manual checks (if no CLI):**

- End-to-end submission against a live Strapi with a real Brevo key is **not** verifiable in this run — it needs provisioned credentials. Confirm instead that the route registers at boot and the email builders are exercised by unit tests.

## Auto Run Result

Status: awaiting-operator

### Summary

Story 7.1 gives a venue owner the first self-service way onto the platform. A public page at `/[locale]/venues/register` collects the venue (name, address, type, description, contact details, logo, photos) and the applicant's personal details, and a Next.js route handler at `/api/venues/register` rate-limits, validates, verifies reCAPTCHA, uploads the media with the server API token, and forwards the application. A new `POST /venues/register` route in the `venues` plugin then provisions, in one auditable service: a blocked `venue-manager` users-permissions account, an unpublished venue in `status: "pending"` whose `manager` points at that account, and two non-blocking emails — a locale-aware confirmation to the applicant and a notification to `ADMIN_NOTIFICATION_EMAIL`.

Three deliberate design choices carry the story. The endpoint lives in the venues plugin rather than extending `users-permissions.register`, because that extension's overrides are assigned onto the upstream controller _factory_ and are inert (story 4.7, still open). The account is `blocked: true` rather than gated by a new flag, so users-permissions already refuses login and approval reduces to unblocking plus flipping the venue status. And because the two records live in different stores with no shared transaction, the user is created first and deleted compensatingly if the venue create fails — orphaned media on a failed upload is the accepted failure mode; a rejected application is not.

`createRateLimit` was promoted from the events-manager plugin into `apps/strapi/src/shared/rate-limit.ts` so the venues plugin could reuse it without importing another plugin's internals; events-manager keeps a re-export so its own tests and imports are untouched.

### Files changed

**Strapi**

- `src/shared/rate-limit.ts` — new; the per-IP fixed-window limiter, promoted into the shared server kit.
- `src/plugins/events-manager/server/src/middlewares/rate-limit.ts` — reduced to a re-export of the shared module.
- `src/plugins/venues/server/src/validation/registration.ts` — new; the Zod contract, with `website` delegating to the canonical `isValidWebsiteUrl` and a bcrypt byte-cap refine on the password.
- `src/plugins/venues/server/src/services/registration.ts` — new; the whole provisioning flow, guards and compensating delete.
- `src/plugins/venues/server/src/services/registration-emails.ts` — new; pure `build*Email` templates (fr/en/ar applicant, fr admin) with HTML escaping and CRLF-stripped subjects.
- `src/plugins/venues/server/src/services/venue.ts` — `findVenues` / `findVenue` now pin `status: "published"` (review pass).
- `src/plugins/venues/server/src/controllers/index.ts` — new `registration` controller; `respondError` logs unmapped errors and withholds their issues.
- `src/plugins/venues/server/src/routes/index.ts` — the public `POST /venues/register` route and its rate-limit middleware.
- `src/plugins/venues/server/src/middlewares/index.ts` — `registration-rate-limit` (200/hour), with the docstring stating plainly that behind the Next proxy it is one global bucket.
- `src/plugins/venues/server/src/services/index.ts` — registers the new service.
- `.env.example` — documents `ADMIN_NOTIFICATION_EMAIL`.
- Tests: new `registration.unit.test.ts` (service), `registration-emails.unit.test.ts`, `registration.unit.test.ts` (controller); extended `routes.unit.test.ts` and `venue.unit.test.ts`.

**Client**

- `src/features/venues/schemas/venue-registration.ts` — new; the single source for the wire schema, the flat form schema, the image/locale constants and the error-code vocabulary.
- `src/app/api/venues/register/route.ts` — new; the public submission proxy.
- `src/app/[locale]/venues/register/page.tsx` and `_components/VenueRegistrationForm.tsx` — new; the page and the form.
- `src/lib/rate-limit.ts` — adds `venueRegistrationLimiter` (5 / 15 min).
- `locales/{en,fr,ar}.json` — the `venues.register` namespace.
- `vitest.config.ts` — the two new test globs.
- Tests: new `venue-registration.test.ts`, `VenueRegistrationForm.test.tsx`, `api/venues/register/route.test.ts`.

### Review findings

One review pass, three reviewers (adversarial, edge-case, verification-gap). 17 patches applied (3 high, 7 medium, 7 low), 6 items deferred as DW-206 … DW-211, 4 rejected. No intent gaps and no spec-level defects, so there was no repair loopback. The three high-severity patches were the publicly readable draft venues, the completely untested route handler, and the rate-limit cap that would have thrown a platform-wide 429 after ten registrations an hour. Full breakdown in the Review Triage Log above.

### Verification

Re-run independently after the patch pass, at HEAD `22a391b`:

| Command                                            | Result                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/admin test`       | PASS — 49 suites, 637 tests                                                             |
| `corepack yarn workspace @tiween/admin lint`       | PASS — `--max-warnings=0`                                                               |
| `corepack yarn workspace @tiween/admin type-check` | PASS                                                                                    |
| `corepack yarn workspace @tiween/client test`      | PASS — 68 files, 698 tests; no React controlled/uncontrolled warning                    |
| `corepack yarn workspace @tiween/client lint`      | PASS — `--max-warnings=0`                                                               |
| `corepack yarn hygiene`                            | PASS — 5450 files, 0 violations                                                         |
| `npx prettier --check` over the touched files      | PASS                                                                                    |
| `corepack yarn workspace @tiween/client typecheck` | 61 errors — **identical to the clean-tree baseline**; none reference this story's paths |

Note: the bare `yarn` shim is broken in this environment (asdf reports no version set); `corepack yarn` is the working invocation. `yarn format:check` fails on ~100 files untouched by this story — a pre-existing repo-wide condition; a blanket `yarn format` was deliberately not run because it would rewrite unrelated files.

### Residual risks

- **Nothing was exercised end-to-end.** Every email path, the reCAPTCHA gate and the media upload are verified only by unit tests with mocked transports. A real submission has never run, because the credentials to run one do not exist yet (see `operator_actions`).
- **Approval has no owner yet.** The story creates blocked accounts and pending drafts but nothing transitions them; until the platform-administration epic ships an approval surface, an admin must unblock the user, set `status: "approved"` and publish the venue by hand.
- **The Next-layer limiter is the only per-applicant throttle**, and `getClientIp` trusts the client-supplied end of `X-Forwarded-For` (DW-206). The Strapi backstop behind it is one global bucket by construction.
- **Uploads are gated on the client-declared MIME type** (DW-207), so an unauthenticated caller can write arbitrary bytes to the media library within the rate limit.
- **The two Zod schemas are hand-duplicated** (DW-209); a backend-only tightening would 400 an applicant only after their media had been uploaded and rolled back.
