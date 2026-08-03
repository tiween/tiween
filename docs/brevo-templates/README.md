# Tiween — Brevo transactional email templates

Eight templates covering **every email the codebase actually sends today**. Each `.html` file is a
self-contained document you can paste straight into Brevo → _Campaigns → Templates → New template →
Import / paste HTML_.

Design: Tiween brand dark green `#032523` canvas, elevated card `#0A3533` on `#0F4542` borders,
yellow `#F8EB06` CTA — pulled from `apps/client/src/styles/theme.css`. Table-based layout, inline
styles, one mobile media query, no external images or web fonts (Arabic falls back to
`Noto Sans Arabic` then system Arabic faces), so they render in Outlook and Gmail alike.

---

## ⚠️ Read this before installing: the provider cannot use these yet

`@ayhid/strapi-provider-email-brevo` **only ever sets `htmlContent`**. It never sets `templateId`
or `params`:

```js
// node_modules/@ayhid/strapi-provider-email-brevo/index.js:119 — the only content path
if (options.html) {
  sendSmtpEmail.htmlContent = options.html
}
```

Every send site passes a hand-built HTML string (`strapi.plugins["email"].services.email.send({ to,
subject, html })`), and the bodies live in code:

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` — `buildWelcomeEmail`, `buildResetPasswordEmail`, `buildEmailChangeEmail`
- `apps/strapi/src/plugins/venues/server/src/services/registration-emails.ts` — applicant + admin
- `apps/strapi/src/plugins/user-engagement/server/src/services/notification-emails.ts` — schedule change
- `apps/strapi/src/lifeCycles/user.ts`, `apps/strapi/src/lifeCycles/adminUser.ts` — starter-template leftovers

**So uploading these templates to Brevo changes nothing on its own.** Pick a path:

### Path A — teach the provider to use Brevo templates (recommended)

The provider is your own package (`github.com/ayhid/strapi-provider-email-brevo`), so this is an
upstream change, not a fork. Add a template branch to `send()`:

```js
// Brevo rejects a payload that carries BOTH templateId and htmlContent — branch, don't merge.
if (options.templateId) {
  sendSmtpEmail.templateId = Number(options.templateId)
  if (options.params) sendSmtpEmail.params = options.params
  // Brevo takes the subject from the template unless one is supplied here.
  if (options.subject) sendSmtpEmail.subject = options.subject
} else {
  if (options.html) sendSmtpEmail.htmlContent = options.html
  if (options.text) sendSmtpEmail.textContent = options.text
}
```

Then each call site swaps its `html` for `templateId` + `params`, and the `build…Email` helpers
shrink to param builders. Keep `sanitizeHeader()` on any value that reaches a subject — Brevo
interpolates params into the subject line too, so the header-injection guard still matters. You can
drop `escapeHtml()` **only** for values passed as `params` (Brevo escapes them); keep it anywhere a
value is still concatenated into HTML.

Worth wiring behind an env flag (`BREVO_USE_TEMPLATES`) so a template mis-configuration can't take
down auth emails — the fallback path stays the in-code HTML.

### Path B — keep bodies in code, use these as the design source

Port the markup into the `build…Email` helpers, replacing `{{ params.x }}` with the existing
`${safeX}` interpolations and `{% if %}` with the locale record already in each file. No provider
change, no Brevo template management, but marketing can't edit copy without a deploy.

---

## Template inventory

| #   | File                                    | Send site                                                            | Locales                 | Params                                                                                |
| --- | --------------------------------------- | -------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| 01  | `01-welcome.html`                       | `sendWelcomeEmail()` — registration (4.1) + first social login (4.2) | fr/en/ar                | `locale`, `first_name`, `browse_url`\*                                                |
| 02  | `02-password-reset.html`                | `sendPasswordResetEmail()` — forgot password (4.3)                   | fr/en/ar                | `locale`, `first_name`, **`action_url`**                                              |
| 03  | `03-email-change-confirmation.html`     | `sendEmailChangeEmail()` — change email (4.4)                        | fr/en/ar                | `locale`, `first_name`, **`action_url`**, `new_email`\*                               |
| 04  | `04-venue-application-received.html`    | venues `registration.ts` — applicant copy (7.1)                      | fr/en/ar                | `locale`, `applicant_name`, `venue_name`                                              |
| 05  | `05-venue-application-admin-alert.html` | venues `registration.ts` — `ADMIN_NOTIFICATION_EMAIL` (7.1)          | **fr only**             | `venue_name`, `applicant_name`, `contact_email`, `venue_document_id`, `admin_url`\*   |
| 06  | `06-schedule-change.html`               | user-engagement `notification.ts` — watchlist alerts (5.6)           | fr/en/ar                | `locale`, `event_title`, `change_type`, `old_datetime`, `new_datetime`, `event_url`\* |
| 07  | `07-account-created-by-admin.html`      | `lifeCycles/user.ts` — admin-provisioned user                        | en default, fr/ar ready | `locale`\*, `name`, **`activation_url`**                                              |
| 08  | `08-strapi-admin-invitation.html`       | `lifeCycles/adminUser.ts` — Strapi admin invite                      | **en only**             | **`registration_url`**, `admin_name`\*, `inviter_name`\*                              |

\* optional — guarded by `{% if %}`, the block disappears when absent. **Bold** = required; the
email is broken without it (dead button).

Locale coverage mirrors the code exactly: 05 is French-only because operational copy is French-first
per the Epic 7 rules, and 08 is English-only because no locale exists at that call site.

---

## Subject lines

Brevo stores the subject on the template. Paste these into the template's _Subject_ field — the same
`{% if %}` syntax works there. Copy is taken verbatim from the shipped code so nothing regresses.

| #   | Subject                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `{% if params.locale == 'en' %}Welcome to Tiween{% elif params.locale == 'ar' %}مرحباً بك في تيوين{% else %}Bienvenue sur Tiween{% endif %}`                                                                                                   |
| 02  | `{% if params.locale == 'en' %}Reset your Tiween password{% elif params.locale == 'ar' %}إعادة تعيين كلمة مرور تيوين{% else %}Réinitialisation de votre mot de passe Tiween{% endif %}`                                                        |
| 03  | `{% if params.locale == 'en' %}Confirm your new Tiween email address{% elif params.locale == 'ar' %}أكّد عنوان بريدك الإلكتروني الجديد في تيوين{% else %}Confirmez votre nouvelle adresse e-mail Tiween{% endif %}`                            |
| 04  | `{% if params.locale == 'en' %}Registration request received: {{ params.venue_name }}{% elif params.locale == 'ar' %}تم استلام طلب التسجيل: {{ params.venue_name }}{% else %}Demande d'inscription reçue : {{ params.venue_name }}{% endif %}` |
| 05  | `Nouvelle demande d'inscription de lieu : {{ params.venue_name }}`                                                                                                                                                                             |
| 06  | `{% if params.locale == 'en' %}Schedule change: {{ params.event_title }}{% elif params.locale == 'ar' %}تغيير في الموعد: {{ params.event_title }}{% else %}Changement d'horaire : {{ params.event_title }}{% endif %}`                         |
| 07  | `{% if params.locale == 'fr' %}Votre compte Tiween{% elif params.locale == 'ar' %}حسابك في تيوين{% else %}Your Tiween account{% endif %}`                                                                                                      |
| 08  | `Tiween — administration panel invitation`                                                                                                                                                                                                     |

**Header-injection guard:** subjects 04, 05 and 06 interpolate user-controlled values (venue name,
event title). The senders already run `sanitizeHeader()` to strip CR/LF and control characters —
that must stay, whichever path you choose above.

---

## Three rules that will bite you

**1. Dates must arrive pre-formatted (template 06).** `old_datetime` / `new_datetime` are display
strings, not ISO timestamps. The sender formats them with `Intl.DateTimeFormat` forced to
`timeZone: "Africa/Tunis"`, and Arabic uses `ar-TN-u-nu-latn` so numerals stay Western per the
project's always-Western-numerals rule (enforced by the story 1-12 lint guard). Brevo will not
convert a timezone or localize a date — pass raw ISO and Tunisian users get the wrong time.

**2. `locale` must be one of `ar` / `fr` / `en`, already normalized.** The templates branch on exact
string equality and fall through to **French**, matching `normalizeLocale()`. Passing `fr-TN`,
`FR`, or `null` silently renders French — correct as a default, wrong if the user picked Arabic. Run
values through the existing `normalizeLocale()` before sending.

**3. Comparison literals use SINGLE quotes — keep it that way.** Every conditional is written
`{% if params.locale == 'ar' %}`, never `== "ar"`. Several of them sit _inside_ HTML attributes:

```html
<td
  dir="{% if params.locale == 'ar' %}rtl{% else %}ltr{% endif %}"
  style="…"
></td>
```

A double quote there closes the `dir="` attribute early, so an editor or sanitizer that parses the
HTML before Brevo substitutes the tags will mangle the markup — the RTL switch and the card styling
are the first things to break. If you add a conditional, use single quotes.

---

## Installing in Brevo

1. _Campaigns → Templates → New template_ → name it `tiween-<nn>-<slug>` (e.g. `tiween-02-password-reset`).
2. Sender: the verified `BREVO_SENDER_EMAIL` identity. Reply-to: same, unless you have a support inbox.
3. Editor: **Rich text / paste your code** → paste the file contents.
4. Subject: from the table above.
5. Save, then **note the numeric template ID** — that's what the provider needs.
6. Send a test to yourself for each locale (see below), then **Activate** the template. An inactive
   template makes the API call fail, which surfaces as `EMAIL_SEND_FAILED`.

Record the IDs somewhere the app can read them, e.g.:

```bash
BREVO_TEMPLATE_WELCOME=1
BREVO_TEMPLATE_PASSWORD_RESET=2
BREVO_TEMPLATE_EMAIL_CHANGE=3
BREVO_TEMPLATE_VENUE_APPLICATION=4
BREVO_TEMPLATE_VENUE_ADMIN_ALERT=5
BREVO_TEMPLATE_SCHEDULE_CHANGE=6
BREVO_TEMPLATE_ACCOUNT_CREATED=7
BREVO_TEMPLATE_ADMIN_INVITE=8
```

## Test payloads

Brevo's _Send a test_ accepts a JSON params object. Minimum viable set per template:

```jsonc
// 02 — run this three times, flipping locale to fr / en / ar
{ "locale": "ar", "first_name": "أيوب", "action_url": "https://tiween.tn/reset?code=TEST" }

// 06 — cancelled has no new_datetime; the others show old → new
{ "locale": "fr", "event_title": "Nuit du cinéma tunisien", "change_type": "postponed",
  "old_datetime": "12/08/2026 20:00", "new_datetime": "19/08/2026 20:00",
  "event_url": "https://tiween.tn/fr/events/test" }

// 05 — French only
{ "venue_name": "Cinéma Le Colisée", "applicant_name": "Ayoub Hidri",
  "contact_email": "contact@colisee.tn", "venue_document_id": "abc123xyz" }
```

Check for each: Arabic renders **RTL** with the card text right-aligned and Western numerals; the
CTA is a yellow block, not a bare link; and no `{{ }}` or `{% %}` leaks into the rendered output
(a leaked tag means a typo'd param name).

---

## Environment variables

Already consumed by `apps/strapi/config/plugins.ts`:

| Var                             | Purpose                                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`                 | Transactional API key. Unset ⇒ provider logs to console instead of sending.                                                                                      |
| `BREVO_SENDER_EMAIL`            | `defaultFrom` + `defaultReplyTo`. Defaults to `noreply@tiween.tn`. Must be a **verified** sender, on a domain with SPF/DKIM configured, or Brevo drops the send. |
| `BREVO_SENDER_NAME`             | Display name. Defaults to `Tiween`.                                                                                                                              |
| `ADMIN_NOTIFICATION_EMAIL`      | Recipient of template 05. Unset ⇒ the alert is skipped with a log warning and nobody learns an application arrived.                                              |
| `CLIENT_ACCOUNT_ACTIVATION_URL` | Base URL for template 07. Unset ⇒ that email is not sent at all.                                                                                                 |
| `APP_URL`                       | Base URL for template 08's registration link.                                                                                                                    |

`BREVO_LIST_ID` is unrelated to these — it belongs to the newsletter contact-list flow in
`apps/client/src/app/api/newsletter/subscribe/route.ts`, which uses the Contacts API, not
transactional email.

---

## Known gap: no order/ticket confirmation email

Epic 6 ticketing (`plugins/ticketing/server/src/services/order.ts`) **sends no email at all** — a
customer completing a Konnect payment currently receives nothing, and there is no ticket/QR
delivery by mail. No template is drafted here because there is no send site to match, and inventing
the params would be guesswork. Worth raising as a story before ticketing goes live.
