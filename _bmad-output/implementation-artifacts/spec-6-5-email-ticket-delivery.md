---
title: "Story 6.5: Email Ticket Delivery"
type: "feature"
created: "2026-08-06"
status: done
baseline_revision: "749eadd072f22b1b10e5e6bb862c7a0447da0004"
final_revision: "23dcb35f907539f1cb5912677d5f70f71cb14902"
review_loop_iteration: 0
followup_review_recommended: true
operator_actions:
  - >-
    Create (or reuse) a Brevo transactional API key at
    https://app.brevo.com/settings/keys/api and set it as BREVO_API_KEY in the
    production Strapi environment (Dokploy env vars); without it buyers receive
    no ticket email — dev/staging may leave it unset to use the console-logging
    fallback.
  - >-
    Verify the sender address noreply@tiween.tn (or whatever
    BREVO_SENDER_EMAIL is set to) in the Brevo console, including the domain's
    SPF/DKIM DNS records, so transactional sends are accepted and land in
    inboxes.
  - >-
    After deploying with the key set, run one sandbox checkout end-to-end and
    confirm the email arrives within 2 minutes with one QR PNG per ticket, the
    .ics attachment, and a working add-to-calendar link (the real-inbox
    acceptance surface no test can reach).
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
warnings: [oversized]
deferred:
  - summary: >-
      No operational safety net for confirmation emails lost in the
      claim-then-send crash window or skipped in loops — no metric, no admin
      surface, no sweep for orders whose marker is set but whose email may
      never have been delivered.
    evidence: |-
      Claim-first CAS means a process crash between the `confirmationEmailSentAt`
      updateMany and the Brevo call leaves the marker permanently set with no
      email sent (accepted spec trade-off vs. duplicate sends); the skip paths
      (legacy/partial QR, recipient-less) only emit repeating log warns with no
      escalation. An admin query or periodic sweep over paid orders with a set
      marker but no delivery evidence would close the loop.
    location: >-
      apps/strapi/src/plugins/ticketing/server/src/services/order-email.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** After Story 6.4 a paid buyer holds signed QR tickets, but only inside the app: nothing emails them, so there is no backup copy outside the app and no recovery when a guest loses the locally-stored access token (DW-239/DW-246 name this story as the intended recovery path). The epic requires a confirmation email within 2 minutes of payment carrying order details, event info, one QR per ticket, and an add-to-calendar link, sent to the account or guest email — and the installed Brevo email provider silently drops attachments, so QR images cannot currently be delivered at all.

**Approach:** Hook a throw-safe, exactly-once confirmation-email send onto the same paid transition that issues QR codes in `reconcileFromGateway` (winner CAS + already-paid self-heal retry), gated by a new private `confirmationEmailSentAt` order attribute claimed via CAS. Build the localized (fr/ar/en) subject+HTML with a pure `confirmation-email` builder module mirroring `notification-emails.ts`, attach one server-generated QR PNG per ticket (new `qrcode` dep) plus a hand-built `.ics`, include a Google-Calendar link, and deliver through the Strapi email plugin via a new in-repo workspace provider `@tiween/strapi-provider-email-brevo` that replicates the current provider's behaviour and adds attachment support. Persist the checkout `locale` on the order so guest emails speak the buyer's language.

## Boundaries & Constraints

**Always:** Email send is triggered ONLY for orders whose `paymentStatus` is `paid`, after `issueQrCodes`, and only when EVERY ticket carries a `qrCode` (a partially-issued order waits for the next confirm/webhook self-heal). Exactly-once via CAS: `db.query(ORDER_UID).updateMany({ where: { documentId, confirmationEmailSentAt: { $null: true } }, data: { confirmationEmailSentAt } })` — proceed only on `count === 1`; if the send then throws, best-effort clear the marker and log so a later confirm retries. Email failures are caught + logged and never undo or block the paid transition or the reconcile return value (mirror `issueQrCodes`'s wrapper). Recipient is `order.user?.email ?? order.guestEmail`; when neither exists, log and skip WITHOUT claiming the marker. Locale precedence: `order.locale` → `user.preferredLanguage` → `"fr"`; this is a transactional email — `emailNotificationsEnabled` is deliberately NOT consulted. The builder module is pure (no Strapi, no I/O), applies `sanitizeHeader` to the subject and `escapeHtml` to every interpolated value, formats dates with `Intl.DateTimeFormat` forced to `timeZone: "Africa/Tunis"` with Latin digits for Arabic (`ar-TN-u-nu-latn`), and renders prices as localized decimal + currency from `order.currency` (never a hardcoded "TND"). The email HTML must NEVER contain `accessToken`, `qrNonce`, or the raw `TWQ1.` token text; the QR token travels only inside the attached PNG pixels. The new provider package replicates the installed provider's contract exactly — same `init(providerOptions, settings)` shape, same dev-mode console logging when `apiKey` is absent (never throws), same error-code mapping (`EMAIL_API_UNAUTHORIZED`, `EMAIL_RATE_LIMITED`, `EMAIL_INVALID_RECIPIENT`, `EMAIL_SEND_FAILED`) — and additionally maps a nodemailer-style `attachments: [{ filename, content, contentType? }]` option to Brevo's `attachment: [{ name, content(base64) }]`. Plugin conventions hold: module-level UID constants, Document Service API (the two sanctioned `db.query` CAS writes excepted), string route handlers untouched, SCREAMING_SNAKE error codes.

**Block If:** Adding the `locale` / `confirmationEmailSentAt` attributes breaks Strapi boot or schema sync; or the workspace provider package cannot be resolved by the email plugin's `require(provider)` bootstrap in the built app.

**Never:** Do NOT put `accessToken` (or any bearer credential) in an emailed URL — the emailed QR PNGs themselves are the guest recovery path; a token-carrying retrieval deep-link stays deferred (DW-239). Do NOT send email from `createOrder`, `initCheckout`, or any pre-payment state. Do NOT modify `node_modules` or fork-publish the npm provider — the replacement lives in `packages/`. Do NOT change `createOrder`'s inventory/transaction semantics, the reconcile CAS, or QR issuance logic beyond appending the email hook. Do NOT build client-side UI (no result-page "email sent" hint — needs data the page doesn't have; no email-preferences UI). Do NOT add a hosted public QR-image endpoint. Do NOT introduce a queue/cron — the webhook + confirm self-heal IS the retry mechanism. Do NOT touch the four existing email call sites (welcome/reset/venues/schedule-change) beyond them transparently using the new provider.

## I/O & Edge-Case Matrix

| Scenario                      | Input / State                                          | Expected Output / Behavior                                                                                                                                                                                                       | Error Handling         |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Send on paid CAS win          | pending order wins paid CAS, all tickets get `qrCode`  | one email to recipient: localized subject/HTML (order number, total+currency, per-ticket lines, event title/date/time/venue, Google-Calendar link), one QR PNG attachment per ticket + one `.ics`; `confirmationEmailSentAt` set | No error expected      |
| Repeat confirm (idempotent)   | order `paid`, marker already set                       | no second email, no writes                                                                                                                                                                                                       | No error expected      |
| Concurrent confirm + webhook  | two racers reach the self-heal path                    | exactly one claims the CAS and sends; the loser does nothing                                                                                                                                                                     | No error expected      |
| Send throws                   | Brevo/API error after marker claimed                   | error logged, marker cleared (best-effort), reconcile result unchanged; next confirm retries                                                                                                                                     | logged, never rethrown |
| Partial QR issuance           | order `paid`, ≥1 ticket has `qrCode: null`             | skip send, marker NOT claimed, logged; a later self-heal completes QRs then sends                                                                                                                                                | logged, never rethrown |
| Guest order                   | `user: null`, `guestEmail` set, `order.locale: "ar"`   | email to `guestEmail`, Arabic copy, Western numerals, greeting uses `guestName`                                                                                                                                                  | No error expected      |
| Account order                 | `user` populated, no `order.locale`                    | email to `user.email` in `user.preferredLanguage`                                                                                                                                                                                | No error expected      |
| No recipient                  | `user: null`, `guestEmail: null`                       | skip, log, marker untouched                                                                                                                                                                                                      | logged, never rethrown |
| Failed/refunded order         | `paymentStatus` ≠ `paid`                               | no email ever                                                                                                                                                                                                                    | No error expected      |
| Header-injection title        | event title contains `\r\nBcc:`                        | subject sanitized via `sanitizeHeader`; HTML escapes the title                                                                                                                                                                   | No error expected      |
| Provider without apiKey (dev) | `BREVO_API_KEY` unset                                  | provider logs the email to console, resolves; marker stays set                                                                                                                                                                   | No error expected      |
| Provider maps attachments     | `send({ attachments: [{filename, content: Buffer}] })` | Brevo payload carries `attachment: [{ name, content: <base64> }]`; omitted entirely when no attachments                                                                                                                          | No error expected      |
| Checkout persists locale      | `POST /orders` with `locale: "ar"`                     | order document stores `locale: "ar"`; absent locale stores null                                                                                                                                                                  | No error expected      |

</intent-contract>

## Code Map

**Ticketing plugin — `apps/strapi/src/plugins/ticketing/server/src/`:**

- `services/order.ts` -- L378-476 `reconcileFromGateway`: winner CAS at L432-454 (calls `this.issueQrCodes` L452), already-paid self-heal at L389-398; `issueQrCodes` L486-494 is the throw-safe wrapper to mirror for a new `sendConfirmationEmail(orderNumber)`; hook the email call right after both `issueQrCodes` call sites. `initCheckout` L253-355: `data.locale` (L307) currently used only for the redirect path — also persist it into the order create. `createOrder` L128-206 builds the order document data (add `locale` passthrough). `TICKET_VIEW_POPULATE` L25-31 shows the `event: { populate: { venue: true } }` populate shape to reuse.
- `services/confirmation-email.ts` (NEW, pure module — NOT registered in `services/index.ts`, mirroring how `notification-emails.ts` is consumed) -- `buildConfirmationEmail(locale, input)` → `{ subject, html }`; `buildGoogleCalendarUrl(input)`; `buildIcs(input)`; own `sanitizeHeader`/`escapeHtml`/`formatEmailDateTime` copies (the per-plugin duplication precedent set by `venues/registration-emails.ts`); localized ticket-type labels (standard "Plein tarif", reduced "Tarif réduit", vip "VIP").
- `services/order-email.ts` (NEW, registered service key `"order-email"`) -- `sendForOrder(orderNumber)`: load order via Document Service (`populate: { tickets: true, event: { populate: { venue: true } }, screening: true, performance: true, user: true }`), guards (paid / all-QRs-present / recipient), locale resolution, CAS-claim marker, generate QR PNGs (`qrcode.toBuffer(ticket.qrCode, { errorCorrectionLevel: "M", width: 512 })`), build `.ics`, send via `strapi.plugins["email"].services.email.send({ to, subject, html, attachments })`, clear marker on throw.
- `services/index.ts` -- register `order-email`.
- `content-types/ticket-order/schema.json` -- ADD `locale` (enumeration ar|fr|en, optional) and `confirmationEmailSentAt` (datetime, private).
- `validation/order.ts` -- `checkoutSchema` already carries `locale` (L80); `createOrderSchema`/`baseOrderShape` needs `locale` added so `createOrder` accepts it.
- `services/__tests__/order-email.unit.test.ts` (NEW) + `services/__tests__/confirmation-email.unit.test.ts` (NEW) + extend `services/__tests__/order-checkout.unit.test.ts` (email hook on winner/self-heal, throw-safety, locale persisted).

**Email provider — `packages/strapi-provider-email-brevo/` (NEW workspace package):**

- `package.json` -- name `@tiween/strapi-provider-email-brevo`, version `1.0.0`, `main: "index.js"`, dependency `@getbrevo/brevo ^3.0.0` (same major as the replaced provider).
- `index.js` -- CJS `init(providerOptions, settings)` → `{ send }`; replicate `node_modules/@ayhid/strapi-provider-email-brevo/index.js` (read it verbatim before writing): `SendSmtpEmail` construction, sender/replyTo defaulting from `settings`, dev-mode console log when no `apiKey`, error mapping table — PLUS `attachments` → Brevo `attachment` mapping (Buffer → base64 string; omit the field when the list is empty/absent).
- `apps/strapi/package.json` -- swap dependency `@ayhid/strapi-provider-email-brevo` → `@tiween/strapi-provider-email-brevo: "1.0.0"`; ADD `qrcode` (+ `@types/qrcode` dev).
- `apps/strapi/config/plugins.ts` -- email block: `provider: "@tiween/strapi-provider-email-brevo"` (resolution verified: `@strapi/email` bootstrap falls back to raw `require(providerName)` for non-`@strapi/provider-email-*` names; workspace symlink makes the name require-able).
- `apps/strapi/src/__tests__/email-brevo-provider.unit.test.ts` (NEW) -- unit-test the provider by importing the workspace package with `@getbrevo/brevo` mocked: send mapping, attachment mapping, dev-mode, error codes.

**Reference patterns (read-only):**

- `apps/strapi/src/plugins/user-engagement/server/src/services/notification-emails.ts` -- the pure-builder pattern to mirror (sanitizeHeader L34, escapeHtml L40, formatEmailDateTime L55 with `ar-TN-u-nu-latn`).
- `apps/strapi/src/plugins/user-engagement/server/src/services/notification.ts` L192-211 -- the send-site pattern (try/catch + `strapi.log.error`).
- `apps/strapi/.env.example` L85-91 -- `BREVO_API_KEY` (commented), `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`; extend the comment to note ticket emails require the key in production.
- `apps/strapi/src/plugins/ticketing/server/src/services/qr.ts` L256-327 -- `issueForOrder` (what `qrCode` holds); do not modify.

## Tasks & Acceptance

**Execution:**

- [ ] `packages/strapi-provider-email-brevo/{package.json,index.js}` -- create the workspace provider replicating the installed `@ayhid` provider byte-for-byte in behaviour and adding `attachments` → Brevo `attachment` (base64) mapping -- unblocks QR delivery for this and every future transactional email.
- [ ] `apps/strapi/package.json` + `apps/strapi/config/plugins.ts` + root lockfile -- swap the provider dependency and `provider` name; add `qrcode` + `@types/qrcode`; run `yarn install` to relink workspaces -- wires the new provider in for all existing send sites unchanged.
- [ ] `apps/strapi/src/__tests__/email-brevo-provider.unit.test.ts` -- unit-test init/send/attachment-mapping/dev-mode/error-codes with `@getbrevo/brevo` mocked -- the provider is the blast-radius change; it must be pinned.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/content-types/ticket-order/schema.json` -- add `locale` (enum ar|fr|en) and `confirmationEmailSentAt` (datetime, private) -- guest email language + exactly-once marker.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/validation/order.ts` -- add optional `locale` to `baseOrderShape` -- lets `createOrder` persist what `checkoutSchema` already validates.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/services/confirmation-email.ts` -- pure localized builder: subject/HTML (fr/ar/en), Google-Calendar URL, `.ics` content, date formatting Africa/Tunis + Latin digits, header sanitization, HTML escaping, ticket-type labels, price formatting from `order.currency` -- fully unit-testable email content.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/services/order-email.ts` + `services/index.ts` -- `sendForOrder(orderNumber)` with the guard/CAS/generate/send/clear-on-throw sequence from the I/O matrix; register the service -- the delivery engine.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` -- persist `locale` through `createOrder`/`initCheckout`; add throw-safe `sendConfirmationEmail` wrapper (mirror `issueQrCodes`) and call it after BOTH `issueQrCodes` sites (winner CAS + already-paid self-heal) -- ties delivery to the exactly-once paid transition with built-in retry.
- [ ] `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/{confirmation-email.unit.test.ts,order-email.unit.test.ts}` + extend `order-checkout.unit.test.ts` -- cover the full I/O matrix rows -- regression net.
- [ ] `apps/strapi/.env.example` -- extend the Brevo comment block: ticket-delivery emails require `BREVO_API_KEY` in production; dev mode logs to console -- operator signpost.

**Acceptance Criteria:**

- Given a pending order whose payment settles `paid`, when reconciliation completes QR issuance, then exactly one confirmation email is sent to the account email (or guest email) containing the order number, total with currency, one line per ticket, the event title/date/time/venue, an add-to-calendar link, one QR PNG attachment per ticket, and an `.ics` attachment — and repeated confirms/webhooks never send a second one.
- Given the buyer checked out in Arabic as a guest, when the email is built, then subject and body are Arabic with Western numerals and Africa/Tunis times, and the recipient is the guest email.
- Given the email API fails, when reconciliation runs, then the order stays `paid`, the reconcile result is unchanged, the failure is logged, and a later confirm/webhook successfully retries the send.
- Given any pre-existing email flow (welcome, password reset, venue registration, schedule change), when it sends through the swapped provider, then its behaviour and payload are unchanged.
- Given the emailed HTML source, when inspected, then it contains no `accessToken`, no `qrNonce`, and no raw `TWQ1.` token text.

## Spec Change Log

## Review Triage Log

### 2026-08-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 0, medium 3, low 9)
- defer: 1: (high 0, medium 0, low 1)
- reject: 9: (high 0, medium 2, low 7)
- addressed_findings:
  - `[medium]` `[patch]` The provider's success `console.log` read `response.body.messageId` inside the try — a Brevo-accepted send with a bodyless response would be remapped to `EMAIL_SEND_FAILED`, clearing the marker and double-sending later. Fixed: log moved after the try with guarded access; test added for a `{}` response.
  - `[medium]` `[patch]` Orders created before Story 6.4 carry legacy UNSIGNED `qrCode` values (DW-241); the new self-heal hook would email those tokens as QR PNGs on the first stale webhook replay or result-page revisit. Fixed: the all-QRs-present gate now requires every code to start with `TWQ1.` — a legacy code skips without claiming the marker, with a warn; test added.
  - `[medium]` `[patch]` The `"order-email"` service registration and the provider package name were verified by no test, and the throw-safe wrapper reduces a broken lookup to a log line — buyers would silently never get the email with CI green. Fixed: new `services-registration.unit.test.ts` pins the barrel keys and factories; the provider suite now asserts `require.resolve` of the package succeeds and `config/plugins.ts` names it exactly.
  - `[low]` `[patch]` Locale precedence: an unsupported non-null `order.locale` short-circuited past a valid `preferredLanguage` straight to fr. Fixed: first supported candidate wins; tests split to expose the masking.
  - `[low]` `[patch]` Every self-heal poll of a paid order fired the CAS write. Fixed: cheap early return when the loaded marker is already set; CAS remains the race guard.
  - `[low]` `[patch]` `user: true` populate pulled the full users-permissions record (password/reset hashes) into memory. Fixed: `fields: ["email", "username", "preferredLanguage"]`.
  - `[low]` `[patch]` HTML-only email (spam scoring, accessibility). Fixed: builder also returns a plain-text part, sent as `text`; tests assert content and no token material.
  - `[low]` `[patch]` ICS gaps: lone `\r` unescaped and no RFC 5545 75-octet folding. Fixed: full `\r\n|\r|\n` escaping plus multibyte-safe folding; lossless-unfold test added.
  - `[low]` `[patch]` Exact workspace pin `"1.0.0"` could silently fall through to the npm registry on a version bump. Fixed: `"*"`; lockfile settled and frozen-install verified.
  - `[low]` `[patch]` No negative test for the moved `locale` validation and no `createOrder`-level persistence assertion. Fixed: `locale: "de"` rejected at both schema entry points; persistence covered at `createOrder` directly.
  - `[low]` `[patch]` The Arabic date regex encoded the current ICU's invisible-mark placement. Fixed: robust per-segment containment assertions.
  - `[low]` `[patch]` `formatEmailPrice`'s unknown-currency fallback `toFixed(2)` misstated 3-minor-unit amounts. Fixed: `` `${amount} ${currency}` `` with tests updated.
- notes: Parallel Blind Hunter + Edge Case Hunter + Verification Gap + Intent Alignment pass over the full baseline diff (`749eadd..HEAD`). Rejected on the evidence: the synchronous send on the confirm path and the claim-first/at-least-once trade-off are spec Design-Note decisions; provider input guards (missing `to`/`from`, null attachment content) would deviate from the spec's replicate-exactly parity rule and are unreachable from the one in-repo caller; `updateMany` returning `undefined`/`count>1` and a user with a null email are states the Strapi query layer and users-permissions schema do not produce; sprint-status bookkeeping belongs to the orchestrator, not this diff; the recipient-less dead end is unreachable through real checkout flows (email is required at the boundary). The intent-alignment auditor's finding that the frontmatter lacked `awaiting-operator`/`operator_actions` is the invocation's mandated finalization step, applied at Finalize below, not a code defect.

## Design Notes

- **Why a workspace provider instead of hosted QR image URLs or data-URIs.** The installed `@ayhid/strapi-provider-email-brevo@0.0.0-development` never sets `SendSmtpEmail.attachment` (verified in node_modules), and the published 3.1.1 is a re-architected admin plugin that still ships no attachment handling. Data-URI images are stripped by Gmail; a hosted QR-image endpoint would put a credential-granting signed URL into logs and require the API to be up for the "backup copy" to exist. Attached PNGs survive independent of the platform — which is the story's point — and the underlying `@getbrevo/brevo` SDK already supports `attachment: [{ content, name }]`. A workspace package keeps the email-plugin integration path (architecture: Brevo via Strapi email plugin) and avoids the `provider.toLowerCase()` hazard an absolute-path provider would hit.
- **Exactly-once shape.** Same CAS idiom as QR issuance (`qrCode: { $null: true }`), on a dedicated `confirmationEmailSentAt` marker: claim-then-send, clear-on-throw. Claim-first means a crash between claim and send loses the email until an operator clears the marker — accepted over send-first, which double-sends on races; the webhook/confirm self-heal retries transient failures because the throw path clears the marker.
- **All-QRs-present gate.** The email's value is the QR backup; sending a partial email and never another would strand the missing tickets. Skipping without claiming lets the next self-heal (which completes issuance) deliver one complete email. If the QR secret is unset, no email is ever sent — that is an ops failure already warned at boot.
- **Calendar link.** Google-Calendar template URL (`action=TEMPLATE`, UTC `dates=<start>/<start+2h>` — no duration data exists on sub-events, 2h is a display default) satisfies the AC's "link"; the `.ics` attachment covers non-Google users for free once attachments exist. Location = venue name; description carries the order number, never tokens.
- **Synchronous send.** The confirm endpoint already awaits QR issuance; awaiting one Brevo call keeps behaviour deterministic and testable, and the 2-minute NFR is met trivially. A timeout/hang on Brevo's side delays the confirm response but cannot corrupt state; the webhook path is unaffected user-wise.
- **`emailNotificationsEnabled` ignored by design.** That flag governs schedule-change notifications (Story 5.6, marketing-adjacent). Ticket delivery is transactional fulfilment of a purchase — suppressing it would strand guests with no artifact at all.

## Verification

**Commands:**

- `yarn install --frozen-lockfile` fails after adding new deps — run plain `yarn install` once to update the lockfile, then use the frozen form. (Worktree note: `node_modules` is never seeded; the repo `yarn` shim is broken — run the nix `yarn.js` under asdf node 22 per project memory.)
- `yarn workspace @tiween/admin test` -- expected: all ticketing suites pass including the three new/extended email suites; no suite skipped.
- `yarn workspace @tiween/admin type-check` -- expected: 0 errors (hyphenated script name).
- `yarn workspace @tiween/admin lint` -- expected: clean (`--max-warnings=0`).
- `yarn workspace @tiween/client test` -- expected: unchanged, all pass (no client files touched — this proves it).

**Manual checks (if no CLI):**

- With `BREVO_API_KEY` unset (dev mode), complete a sandbox checkout and confirm: the console logs one email whose HTML contains order/event/venue details and a Google-Calendar URL, with one PNG attachment per ticket and one `.ics`; re-running confirm logs nothing further. Requires a booted Strapi — record as residual risk if not run in this worktree.
- Production delivery (real Brevo send within 2 minutes, sender domain accepted) requires `BREVO_API_KEY` and a verified `noreply@tiween.tn` sender in the Brevo console — operator actions, not verifiable from this repo.

## Auto Run Result

Status: awaiting-operator — implementation and review complete; the only remaining acceptance surface (a real email arriving in a real inbox) requires vendor-console actions enumerated under `operator_actions` in the frontmatter.

**Change implemented:** Purchase-confirmation email delivery hooked onto the exactly-once paid transition in `reconcileFromGateway` (winner CAS + already-paid self-heal retry), gated by a claim-first CAS on the new private `confirmationEmailSentAt` order attribute. A pure localized (fr/ar/en) builder produces subject, HTML and plain-text bodies with Africa/Tunis dates, Western numerals, header sanitization and full HTML escaping; the email carries one server-generated 512px QR PNG per ticket (new `qrcode` dep — the signed token travels only inside the PNG pixels, never in the HTML), a hand-built RFC 5545 `.ics`, and a Google-Calendar link. Delivery goes through a new in-repo workspace provider `@tiween/strapi-provider-email-brevo` that replicates the previous provider and adds attachment support. Checkout `locale` is now persisted on the order so guest emails speak the buyer's language; account orders fall back to `preferredLanguage`, then fr.

**Files changed:**

- `packages/strapi-provider-email-brevo/{package.json,index.js}` — new workspace email provider: Brevo API send, dev-mode console fallback, error-code mapping, attachments → Brevo `attachment` (base64).
- `apps/strapi/package.json` + `config/plugins.ts` + `yarn.lock` — provider dependency swap (`@ayhid/…` → `@tiween/…` at `"*"`), `qrcode` + `@types/qrcode` added.
- `apps/strapi/src/plugins/ticketing/server/src/content-types/ticket-order/schema.json` — new `locale` (enum) and `confirmationEmailSentAt` (datetime, private).
- `.../ticketing/server/src/validation/order.ts` — `locale` moved into the shared base shape.
- `.../ticketing/server/src/services/confirmation-email.ts` — pure builder (subject/HTML/text, calendar URL, `.ics` with escaping + 75-octet folding, price/date formatting).
- `.../ticketing/server/src/services/order-email.ts` + `services/index.ts` — the delivery engine: guards (paid, all-QRs-signed `TWQ1.`, recipient), locale resolution, CAS claim, QR PNG generation, send, clear-on-throw; registered as `order-email`.
- `.../ticketing/server/src/services/order.ts` — locale persisted through checkout; throw-safe `sendConfirmationEmail` wrapper called after both `issueQrCodes` sites.
- `apps/strapi/.env.example` — Brevo block notes ticket emails require the key in production.
- Tests: `confirmation-email.unit.test.ts`, `order-email.unit.test.ts`, `services-registration.unit.test.ts`, `apps/strapi/src/__tests__/email-brevo-provider.unit.test.ts` (new), `order-checkout.unit.test.ts` + `order.unit.test.ts` (extended).

**Review findings:** 12 patches applied (3 medium: provider success-log crash that could double-send, legacy unsigned-QR orders being emailed, untested service/provider wiring that fails silently; 9 low: locale-precedence masking, per-poll CAS write, over-broad user populate, missing plain-text part, ICS escaping/folding, exact workspace pin, missing validation tests, ICU-fragile assertion, price-fallback rounding). 1 deferred (operational sweep/metrics for lost-or-skipped emails). 9 rejected on the evidence (see triage notes).

**Follow-up review recommendation: true** — patched counts: high 0, medium 3, low 9; score 3×3 + 9×1 = 18 ≥ 5. No high-severity patch, but the medium patches touch the delivery engine's gates and the provider shared by every email flow, so one more converging pass is worthwhile.

**Verification performed:**

- `yarn workspace @tiween/admin test` — 64 suites / 938 tests, all pass (was 60/885 at baseline).
- `yarn workspace @tiween/admin type-check` — 0 errors. `lint` (`--max-warnings=0`) — clean.
- `yarn workspace @tiween/client test` — 86 files / 902 tests, all pass, unchanged (no client files touched).
- `yarn install --frozen-lockfile` — clean after the dependency changes.
- `yarn workspace @tiween/admin test:integration` — Strapi boots on SQLite with the new schema attributes and resolves the new provider (5 passed, 1 pre-existing skip), clearing both spec Block-If conditions.
- All gates run as `node <nix yarn.js>` under asdf node 22 (repo yarn shim is broken).
- Matrix audit: every I/O matrix row maps to at least one test that ran and passed in the gate run.

**Residual risks:**

- The manual dev-mode sandbox checkout (console-logged email on a live checkout with a booted dev Strapi + Konnect sandbox) was not run in this session; backend behaviour is pinned by unit tests plus the boot suite only.
- Real-inbox rendering (Gmail/Outlook attachment display, spam scoring, the 2-minute NFR) is only verifiable after the operator actions below.
- Claim-first CAS crash window and skip-loop observability recorded as a deferred item.
- DW-241 (legacy unsigned `qrCode` rows) remains open; this story's `TWQ1.` gate stops those rows from being emailed but does not backfill them.

## Operator Confirmation

Confirmed 2026-08-06: the external actions this story owed were carried out.

- Create (or reuse) a Brevo transactional API key at https://app.brevo.com/settings/keys/api and set it as BREVO_API_KEY in the production Strapi environment (Dokploy env vars); without it buyers receive no ticket email — dev/staging may leave it unset to use the console-logging fallback.
- Verify the sender address noreply@tiween.tn (or whatever BREVO_SENDER_EMAIL is set to) in the Brevo console, including the domain's SPF/DKIM DNS records, so transactional sends are accepted and land in inboxes.
- After deploying with the key set, run one sandbox checkout end-to-end and confirm the email arrives within 2 minutes with one QR PNG per ticket, the .ics attachment, and a working add-to-calendar link (the real-inbox acceptance surface no test can reach).

_Appended by the bmad-loop orchestrator (`bmad-loop confirm`, #335): a human confirmed these external actions out of band, and the story was advanced from `awaiting-operator` to `done`._
