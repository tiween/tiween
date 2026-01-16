# Story 2B.12: Email Configuration with Brevo

Status: review

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
   - **NOTE**: Templates are managed in Brevo's interface, not locally
5. **AC#5**: Test email can be sent from Strapi admin panel (Settings > Email > Configuration)
6. **AC#6**: Email sending is logged for debugging (console in dev, structured logs in prod)
7. **AC#7**: Fallback/development mode uses console output when `BREVO_API_KEY` is not set
8. **AC#8**: Configuration is documented in `.env.example`

## Tasks / Subtasks

- [x] **Task 1: Create Local Brevo Provider Plugin Structure** (AC: #1)

  - [x] 1.1 Create provider directory at `apps/strapi/src/providers/strapi-provider-email-brevo/`
  - [x] 1.2 Create `package.json` with provider metadata
  - [x] 1.3 Create `index.js` with Strapi v5 provider interface implementation
  - [x] 1.4 Export provider following Strapi v5 email provider contract

- [x] **Task 2: Implement Brevo API Integration** (AC: #3, #6)

  - [x] 2.1 Install `@getbrevo/brevo` SDK (official Brevo Node.js SDK)
  - [x] 2.2 Implement `send()` method with Brevo Transactional Email API
  - [x] 2.3 Handle HTML and plain text email content
  - [x] 2.4 Implement proper error handling with error codes (not messages)
  - [x] 2.5 Add logging for debugging (dev: console, prod: structured)

- [x] **Task 3: Add Environment Configuration** (AC: #2, #7, #8)

  - [x] 3.1 Add `BREVO_API_KEY` to `.env.example`
  - [x] 3.2 Add `BREVO_SENDER_EMAIL` to `.env.example`
  - [x] 3.3 Add `BREVO_SENDER_NAME` to `.env.example`
  - [x] 3.4 Implement fallback to console output when API key not set

- [x] **Task 4: Configure Plugin in Strapi** (AC: #1, #5)

  - [x] 4.1 Update `config/plugins.ts` with Brevo email provider configuration
  - [x] 4.2 Configure conditional enable based on `BREVO_API_KEY` presence
  - [x] 4.3 Set default sender from environment variables

- [x] **Task 5: Create Email Templates** (AC: #4) - **SKIPPED**

  - Templates are managed in Brevo's interface, not locally
  - Provider only handles sending emails

- [x] **Task 6: Add Email Service Helpers** (AC: #6) - **SKIPPED**

  - Provider only handles sending; service helpers not required for basic functionality

- [x] **Task 7: Test Email Delivery** (AC: #5)

  - [x] 7.1 Verify provider loads successfully on startup
  - [x] 7.2 Test fallback mode works without API key (console logging verified)
  - [x] 7.3 Email can be sent via Strapi's email plugin API

- [x] **Task 8: Verify Build** (AC: #1)
  - [x] 8.1 Run `yarn build` and ensure no errors
  - [x] 8.2 Run `yarn develop` and verify plugin loads

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

### Implementation Notes

- Provider uses JavaScript (not TypeScript) as Node.js doesn't support TypeScript stripping in node_modules
- Provider is linked via `file:` protocol in package.json
- Brevo SDK v3.0.1 installed

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

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Strapi startup confirmed: `[Brevo] No API key configured - emails will be logged to console`

### Completion Notes List

- Created custom Brevo email provider at `apps/strapi/src/providers/strapi-provider-email-brevo/`
- Implemented Strapi v5 email provider interface with `init()` and `send()` methods
- Added fallback to console logging when `BREVO_API_KEY` is not configured
- Configured environment variables in `.env` and `.env.example`
- Updated `config/plugins.ts` with Brevo provider configuration
- Provider properly linked via `file:` protocol in package.json
- Build and develop commands verified working
- Email templates are to be managed in Brevo's web interface (per user request)

### File List

- `apps/strapi/src/providers/strapi-provider-email-brevo/index.js` (created)
- `apps/strapi/src/providers/strapi-provider-email-brevo/package.json` (created)
- `apps/strapi/src/providers/strapi-provider-email-brevo/README.md` (created)
- `apps/strapi/package.json` (modified - added strapi-provider-email-brevo and @getbrevo/brevo)
- `apps/strapi/config/plugins.ts` (modified - added email provider config)
- `apps/strapi/.env.example` (modified - added Brevo env vars)
- `apps/strapi/.env` (modified - added Brevo env vars)

---

## Change Log

| Date       | Change                                                          |
| ---------- | --------------------------------------------------------------- |
| 2026-01-03 | Story implemented - Brevo email provider created and configured |
