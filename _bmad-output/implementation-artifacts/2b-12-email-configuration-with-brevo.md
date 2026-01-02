# Story 2B.12: Email Configuration with Brevo

Status: ready-for-dev

---

## Story

As a **developer**,
I want to develop a custom local Brevo email provider plugin for Strapi v5 and configure it for transactional emails,
So that the platform can reliably deliver order confirmations, ticket deliveries, password resets, and venue notifications using Brevo's Transactional Email API.

## Acceptance Criteria

1. **AC#1**: Custom Brevo provider plugin is created at `apps/strapi/src/providers/strapi-provider-email-brevo/`
2. **AC#2**: Brevo API key is configured via environment variable `BREVO_API_KEY`
3. **AC#3**: Provider implements `send()` method compatible with Strapi v5 email plugin interface
4. **AC#4**: Email templates are created for:
   - Order confirmation
   - Ticket delivery (with QR code)
   - Password reset
   - Venue approval/rejection
5. **AC#5**: Test email can be sent from Strapi admin panel (Settings > Email > Configuration)
6. **AC#6**: Email sending is logged for debugging (console in dev, structured logs in prod)
7. **AC#7**: Fallback/development mode uses console output when `BREVO_API_KEY` is not set
8. **AC#8**: Configuration is documented in `.env.example`

## Tasks / Subtasks

- [ ] **Task 1: Create Local Brevo Provider Plugin Structure** (AC: #1)

  - [ ] 1.1 Create provider directory at `apps/strapi/src/providers/strapi-provider-email-brevo/`
  - [ ] 1.2 Create `package.json` with provider metadata
  - [ ] 1.3 Create `index.ts` with Strapi v5 provider interface implementation
  - [ ] 1.4 Export provider following Strapi v5 email provider contract

- [ ] **Task 2: Implement Brevo API Integration** (AC: #3, #6)

  - [ ] 2.1 Install `@getbrevo/brevo` SDK (official Brevo Node.js SDK)
  - [ ] 2.2 Implement `send()` method with Brevo Transactional Email API
  - [ ] 2.3 Handle HTML and plain text email content
  - [ ] 2.4 Implement proper error handling with error codes (not messages)
  - [ ] 2.5 Add logging for debugging (dev: console, prod: structured)

- [ ] **Task 3: Add Environment Configuration** (AC: #2, #7, #8)

  - [ ] 3.1 Add `BREVO_API_KEY` to `.env.example`
  - [ ] 3.2 Add `BREVO_SENDER_EMAIL` to `.env.example`
  - [ ] 3.3 Add `BREVO_SENDER_NAME` to `.env.example`
  - [ ] 3.4 Implement fallback to console output when API key not set

- [ ] **Task 4: Configure Plugin in Strapi** (AC: #1, #5)

  - [ ] 4.1 Update `config/plugins.ts` with Brevo email provider configuration
  - [ ] 4.2 Configure conditional enable based on `BREVO_API_KEY` presence
  - [ ] 4.3 Set default sender from environment variables

- [ ] **Task 5: Create Email Templates** (AC: #4)

  - [ ] 5.1 Create order confirmation template (HTML + text)
  - [ ] 5.2 Create ticket delivery template with QR code placeholder
  - [ ] 5.3 Create password reset template
  - [ ] 5.4 Create venue approval template
  - [ ] 5.5 Create venue rejection template
  - [ ] 5.6 Store templates in `apps/strapi/src/extensions/email/templates/`

- [ ] **Task 6: Add Email Service Helpers** (AC: #6)

  - [ ] 6.1 Create `src/services/email-service.ts` with logging wrapper
  - [ ] 6.2 Add sendOrderConfirmation function
  - [ ] 6.3 Add sendTicketDelivery function
  - [ ] 6.4 Add sendVenueApproval/Rejection functions

- [ ] **Task 7: Test Email Delivery** (AC: #5)

  - [ ] 7.1 Verify test email from admin panel works
  - [ ] 7.2 Test with real Brevo API key in development
  - [ ] 7.3 Verify fallback mode works without API key

- [ ] **Task 8: Verify Build** (AC: #1)
  - [ ] 8.1 Run `yarn build` and ensure no errors
  - [ ] 8.2 Run `yarn develop` and verify plugin loads

---

## Dev Notes

### Architecture Decision Reference

From `core-architectural-decisions.md`:

```
External Services:
| Service   | Provider | Purpose                               |
|-----------|----------|---------------------------------------|
| Email     | Brevo    | Transactional emails, ticket delivery |
```

### Why Custom Local Provider (Not SMTP or Community Package)

**Decision**: Develop a custom local Brevo email provider using the Brevo Transactional Email API.

**Rationale**:

1. **No existing Strapi v5 compatible Brevo provider** - community packages are outdated (940+ days old)
2. **API vs SMTP advantages**:
   - Direct API calls are faster than SMTP handshakes
   - Better error handling and response codes
   - Access to advanced features (tracking, scheduling, attachments)
   - No SMTP connection limits or timeouts
3. **Full control** - can customize for Tiween's specific needs
4. **Easier maintenance** - no external dependency versioning issues
5. **Template integration** - can tightly integrate with Strapi's template system

### Brevo Transactional Email API Overview

Brevo provides an official Node.js SDK (`@getbrevo/brevo`) for their Transactional Email API:

```typescript
import * as Brevo from "@getbrevo/brevo"

const apiInstance = new Brevo.TransactionalEmailsApi()
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  "YOUR_API_KEY"
)

const sendSmtpEmail = new Brevo.SendSmtpEmail()
sendSmtpEmail.subject = "Subject"
sendSmtpEmail.htmlContent = "<html><body>HTML content</body></html>"
sendSmtpEmail.textContent = "Plain text content"
sendSmtpEmail.sender = { name: "Sender Name", email: "sender@example.com" }
sendSmtpEmail.to = [{ email: "recipient@example.com", name: "Recipient Name" }]

await apiInstance.sendTransacEmail(sendSmtpEmail)
```

### Getting Brevo API Key

1. Login to [Brevo Dashboard](https://app.brevo.com)
2. Navigate to Settings → SMTP & API
3. Click "Generate a new API key"
4. Copy the API key (starts with `xkeysib-...`)

### Environment Variables

```bash
# ------- Brevo (Email) -------

# Brevo API key (get from https://app.brevo.com/settings/keys/api)
# Required for production, optional in development (falls back to console logging)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Default sender email (must be verified in Brevo)
BREVO_SENDER_EMAIL=noreply@tiween.tn

# Default sender name
BREVO_SENDER_NAME=Tiween
```

### Strapi v5 Email Provider Contract

The provider must implement this interface:

```typescript
// Strapi v5 Email Provider Interface
interface EmailProviderInit {
  init(providerOptions: ProviderOptions, settings: Settings): EmailProvider
}

interface EmailProvider {
  send(options: SendOptions): Promise<void>
}

interface SendOptions {
  from?: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  subject: string
  text?: string
  html?: string
}
```

### Provider Directory Structure

```
apps/strapi/src/providers/strapi-provider-email-brevo/
├── package.json
├── index.ts
└── README.md
```

### Provider package.json

```json
{
  "name": "strapi-provider-email-brevo",
  "version": "1.0.0",
  "description": "Brevo (Sendinblue) email provider for Strapi v5 - Tiween local provider",
  "main": "index.ts",
  "license": "MIT",
  "peerDependencies": {
    "@strapi/strapi": "^5.0.0"
  },
  "dependencies": {
    "@getbrevo/brevo": "^2.0.0"
  }
}
```

### Provider Implementation (index.ts)

```typescript
// apps/strapi/src/providers/strapi-provider-email-brevo/index.ts
import * as Brevo from "@getbrevo/brevo"

interface ProviderOptions {
  apiKey?: string
}

interface Settings {
  defaultFrom: string
  defaultReplyTo?: string
  defaultSenderName?: string
}

interface SendOptions {
  from?: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  subject: string
  text?: string
  html?: string
}

interface EmailAddress {
  email: string
  name?: string
}

/**
 * Parse email string to Brevo format
 * Supports: "email@example.com" or "Name <email@example.com>"
 */
function parseEmail(email: string): EmailAddress {
  const match = email.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/)
  if (match) {
    return {
      email: match[2].trim(),
      name: match[1]?.trim() || undefined,
    }
  }
  return { email: email.trim() }
}

/**
 * Parse recipients to Brevo format
 */
function parseRecipients(recipients: string | string[]): EmailAddress[] {
  const list = Array.isArray(recipients) ? recipients : [recipients]
  return list.map(parseEmail)
}

export = {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const apiKey = providerOptions.apiKey

    // Development fallback - log to console when no API key
    if (!apiKey) {
      console.warn(
        "[Brevo] No API key configured - emails will be logged to console"
      )

      return {
        async send(options: SendOptions) {
          console.log("📧 [DEV MODE] Email would be sent:")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("From:", options.from || settings.defaultFrom)
          console.log("To:", options.to)
          if (options.cc) console.log("CC:", options.cc)
          if (options.bcc) console.log("BCC:", options.bcc)
          console.log("Subject:", options.subject)
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          if (options.text) {
            console.log("Text Preview:", options.text.substring(0, 200) + "...")
          }
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        },
      }
    }

    // Production mode - use Brevo API
    const apiInstance = new Brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)

    return {
      async send(options: SendOptions) {
        const sendSmtpEmail = new Brevo.SendSmtpEmail()

        // Required fields
        sendSmtpEmail.subject = options.subject
        sendSmtpEmail.to = parseRecipients(options.to)

        // Sender
        const senderEmail = options.from || settings.defaultFrom
        sendSmtpEmail.sender = parseEmail(senderEmail)
        if (settings.defaultSenderName && !sendSmtpEmail.sender.name) {
          sendSmtpEmail.sender.name = settings.defaultSenderName
        }

        // Content - at least one required
        if (options.html) {
          sendSmtpEmail.htmlContent = options.html
        }
        if (options.text) {
          sendSmtpEmail.textContent = options.text
        }

        // Optional fields
        if (options.replyTo) {
          sendSmtpEmail.replyTo = parseEmail(options.replyTo)
        } else if (settings.defaultReplyTo) {
          sendSmtpEmail.replyTo = parseEmail(settings.defaultReplyTo)
        }

        if (options.cc) {
          sendSmtpEmail.cc = parseRecipients(options.cc)
        }

        if (options.bcc) {
          sendSmtpEmail.bcc = parseRecipients(options.bcc)
        }

        try {
          const response = await apiInstance.sendTransacEmail(sendSmtpEmail)
          console.log(
            `[Brevo] Email sent successfully. MessageId: ${response.body.messageId}`
          )
        } catch (error: any) {
          console.error("[Brevo] Failed to send email:", error.message)

          // Map Brevo errors to consistent error codes
          if (error.statusCode === 401) {
            throw new Error("EMAIL_API_UNAUTHORIZED")
          }
          if (error.statusCode === 429) {
            throw new Error("EMAIL_RATE_LIMITED")
          }
          if (error.body?.code === "invalid_parameter") {
            throw new Error("EMAIL_INVALID_RECIPIENT")
          }

          throw new Error("EMAIL_SEND_FAILED")
        }
      },
    }
  },
}
```

### Plugin Configuration in Strapi

```typescript
// config/plugins.ts - Email section
email: {
  config: {
    provider: '../src/providers/strapi-provider-email-brevo',
    providerOptions: {
      apiKey: env('BREVO_API_KEY'),
    },
    settings: {
      defaultFrom: env('BREVO_SENDER_EMAIL', 'noreply@tiween.tn'),
      defaultReplyTo: env('BREVO_SENDER_EMAIL', 'noreply@tiween.tn'),
      defaultSenderName: env('BREVO_SENDER_NAME', 'Tiween'),
    },
  },
},
```

### Email Templates Structure

Create templates at `src/extensions/email/templates/`:

```
src/extensions/email/templates/
├── order-confirmation.html
├── order-confirmation.txt
├── ticket-delivery.html
├── ticket-delivery.txt
├── password-reset.html
├── password-reset.txt
├── venue-approval.html
├── venue-approval.txt
├── venue-rejection.html
└── venue-rejection.txt
```

### Order Confirmation Template Example

```html
<!-- src/extensions/email/templates/order-confirmation.html -->
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Confirmation de commande - Tiween</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"
  >
    <div style="background: #6366f1; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0;">Tiween</h1>
    </div>

    <div style="padding: 20px;">
      <h2>Merci pour votre commande!</h2>

      <p>Bonjour <%= user.firstname %>,</p>

      <p>
        Votre commande <strong>#<%= order.orderNumber %></strong> a été
        confirmée.
      </p>

      <div
        style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"
      >
        <h3 style="margin-top: 0;"><%= event.title %></h3>
        <p>
          <strong>Date:</strong> <%= showtime.date %> à <%= showtime.time %>
        </p>
        <p><strong>Lieu:</strong> <%= venue.name %></p>
        <p>
          <strong>Tickets:</strong> <%= order.ticketCount %> x <%=
          order.ticketType %>
        </p>
        <p><strong>Total:</strong> <%= order.totalAmount %> TND</p>
      </div>

      <p>
        Vos billets électroniques sont joints à cet email et disponibles dans
        votre compte.
      </p>

      <a
        href="<%= ticketUrl %>"
        style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;"
      >
        Voir mes billets
      </a>

      <p style="color: #6b7280; font-size: 14px;">
        Si vous avez des questions, contactez-nous à support@tiween.tn
      </p>
    </div>

    <div
      style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;"
    >
      <p>© 2025 Tiween. Tous droits réservés.</p>
    </div>
  </body>
</html>
```

### Email Service Helper

```typescript
// src/services/email-service.ts
import type { Core } from "@strapi/strapi"

interface OrderEmailData {
  user: { firstname: string; email: string }
  order: {
    orderNumber: string
    ticketCount: number
    ticketType: string
    totalAmount: number
  }
  event: { title: string }
  venue: { name: string }
  showtime: { date: string; time: string }
  ticketUrl: string
}

interface VenueEmailData {
  venue: { name: string; managerEmail: string; managerName: string }
  reason?: string // For rejection
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(data: OrderEmailData) {
    const { user, order } = data

    strapi.log.info(
      `[Email] Sending order confirmation to ${user.email} for order #${order.orderNumber}`
    )

    try {
      await strapi.plugins["email"].services.email.sendTemplatedEmail(
        { to: user.email },
        {
          subject: `Confirmation de commande #${order.orderNumber} - Tiween`,
          html: await this.loadTemplate("order-confirmation", data),
          text: await this.loadTemplate("order-confirmation", data, "txt"),
        },
        data
      )

      strapi.log.info(
        `[Email] Order confirmation sent successfully to ${user.email}`
      )
    } catch (error) {
      strapi.log.error(
        `[Email] Failed to send order confirmation: ${error.message}`
      )
      throw error
    }
  },

  /**
   * Send ticket delivery email with QR codes
   */
  async sendTicketDelivery(
    data: OrderEmailData & {
      tickets: Array<{ qrCodeUrl: string; ticketNumber: string }>
    }
  ) {
    const { user, tickets, event } = data

    strapi.log.info(
      `[Email] Sending ${tickets.length} tickets to ${user.email}`
    )

    try {
      await strapi.plugins["email"].services.email.sendTemplatedEmail(
        { to: user.email },
        {
          subject: `Vos billets pour ${event.title} - Tiween`,
          html: await this.loadTemplate("ticket-delivery", data),
          text: await this.loadTemplate("ticket-delivery", data, "txt"),
        },
        data
      )

      strapi.log.info(`[Email] Tickets sent successfully to ${user.email}`)
    } catch (error) {
      strapi.log.error(`[Email] Failed to send tickets: ${error.message}`)
      throw error
    }
  },

  /**
   * Send venue approval email
   */
  async sendVenueApproval(data: VenueEmailData) {
    const { venue } = data

    strapi.log.info(`[Email] Sending venue approval to ${venue.managerEmail}`)

    try {
      await strapi.plugins["email"].services.email.sendTemplatedEmail(
        { to: venue.managerEmail },
        {
          subject: `Votre espace ${venue.name} est approuvé - Tiween`,
          html: await this.loadTemplate("venue-approval", data),
          text: await this.loadTemplate("venue-approval", data, "txt"),
        },
        data
      )

      strapi.log.info(`[Email] Venue approval sent to ${venue.managerEmail}`)
    } catch (error) {
      strapi.log.error(
        `[Email] Failed to send venue approval: ${error.message}`
      )
      throw error
    }
  },

  /**
   * Send venue rejection email
   */
  async sendVenueRejection(data: VenueEmailData) {
    const { venue } = data

    strapi.log.info(`[Email] Sending venue rejection to ${venue.managerEmail}`)

    try {
      await strapi.plugins["email"].services.email.sendTemplatedEmail(
        { to: venue.managerEmail },
        {
          subject: `Mise à jour de votre demande - Tiween`,
          html: await this.loadTemplate("venue-rejection", data),
          text: await this.loadTemplate("venue-rejection", data, "txt"),
        },
        data
      )

      strapi.log.info(`[Email] Venue rejection sent to ${venue.managerEmail}`)
    } catch (error) {
      strapi.log.error(
        `[Email] Failed to send venue rejection: ${error.message}`
      )
      throw error
    }
  },

  /**
   * Load email template from file
   */
  async loadTemplate(
    templateName: string,
    data: Record<string, unknown>,
    extension: "html" | "txt" = "html"
  ): Promise<string> {
    const fs = require("fs").promises
    const path = require("path")
    const _ = require("lodash")

    const templatePath = path.join(
      strapi.dirs.app.extensions,
      "email",
      "templates",
      `${templateName}.${extension}`
    )

    try {
      const template = await fs.readFile(templatePath, "utf-8")
      const compiled = _.template(template)
      return compiled(data)
    } catch (error) {
      strapi.log.error(
        `[Email] Template not found: ${templateName}.${extension}`
      )
      throw new Error(`Email template '${templateName}.${extension}' not found`)
    }
  },
})
```

### Error Handling Pattern

Follow project error code pattern (no hardcoded messages):

```typescript
const ERROR_CODES = {
  EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",
  EMAIL_INVALID_RECIPIENT: "EMAIL_INVALID_RECIPIENT",
  EMAIL_API_UNAUTHORIZED: "EMAIL_API_UNAUTHORIZED",
  EMAIL_RATE_LIMITED: "EMAIL_RATE_LIMITED",
  EMAIL_TEMPLATE_NOT_FOUND: "EMAIL_TEMPLATE_NOT_FOUND",
} as const
```

### Development Fallback Behavior

When `BREVO_API_KEY` is not set:

- Provider logs emails to console with formatted output
- No actual emails are sent
- Perfect for local development without Brevo account
- Clear visual indication in logs that email is in dev mode

### Testing Email in Admin Panel

1. Start Strapi: `yarn develop`
2. Navigate to Settings → Email plugin
3. Enter test recipient email
4. Click "Send test email"
5. With API key: verify email received
6. Without API key: check console for logged email

### i18n Considerations

Email templates should support multiple languages (FR/AR/EN):

- Use user's `preferredLanguage` from profile
- Load language-specific template: `order-confirmation.fr.html`
- Fall back to French if translation missing

### Previous Story Context

From **Story 2B.11 (ImageKit Provider Configuration)**:

- Similar local provider pattern in `src/providers/`
- Conditional enable based on environment variables
- Package.json with peer dependencies pattern

### Project Structure Notes

**Files to Create:**

```
apps/strapi/
├── src/
│   ├── providers/
│   │   └── strapi-provider-email-brevo/
│   │       ├── package.json
│   │       ├── index.ts
│   │       └── README.md
│   ├── extensions/
│   │   └── email/
│   │       └── templates/
│   │           ├── order-confirmation.html
│   │           ├── order-confirmation.txt
│   │           ├── ticket-delivery.html
│   │           ├── ticket-delivery.txt
│   │           ├── password-reset.html
│   │           ├── password-reset.txt
│   │           ├── venue-approval.html
│   │           ├── venue-approval.txt
│   │           ├── venue-rejection.html
│   │           └── venue-rejection.txt
│   └── services/
│       └── email-service.ts
```

**Files to Modify:**

```
apps/strapi/
├── package.json              # Add @getbrevo/brevo dependency
├── .env.example              # Add Brevo environment variables
└── config/
    └── plugins.ts            # Add email provider configuration
```

### References

- [Brevo Node.js SDK](https://github.com/getbrevo/brevo-node)
- [Brevo Transactional Email API](https://developers.brevo.com/reference/sendtransacemail)
- [Strapi v5 Email Plugin Documentation](https://docs.strapi.io/dev-docs/plugins/email)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.12]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#External Services]
- [Source: _bmad-output/implementation-artifacts/2b-11-imagekit-provider-configuration.md]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
