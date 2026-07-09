# Epic 4 Context: User Authentication & Profiles

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic gives visitors real accounts and gives the platform an identity layer the rest of the product builds on. Users can register and sign in (email/password or Google/Facebook), recover a lost password, manage their profile (name, avatar, verified email), and set the language and default region that personalize what they see. It also preserves the platform's low-friction ethos: discovery and even purchase never require an account, so guest checkout and later account-linking are part of the same identity story. Auth is the shared foundation that Phase 2 epics (Watchlist, Ticketing, B2B Venue) gate on, so correctness and security here matter beyond this epic.

## Stories

- Story 4.1: Email and Password Registration
- Story 4.2: Social Login with Google and Facebook
- Story 4.3: Password Reset Flow
- Story 4.4: Profile Management
- Story 4.5: Language and Region Preferences
- Story 4.6: Guest Checkout Capability

## Requirements & Constraints

- Registration, social login, password reset, profile editing, and language/region preferences are MVP-basic scope. Guest checkout and purchase-history linking are Phase 2 (they depend on the ticketing flow existing) — build the guest-identity groundwork so a later account created with the same email can inherit prior purchases.
- Password strength is enforced (min 8 chars, mixed case, a number) with real-time strength feedback and cross-field confirm-password validation on blur.
- Passwords are hashed with bcrypt at cost factor 12+. Never store passwords or payment data on Tiween servers.
- Sessions expire after 30 days of inactivity. Password reset must invalidate all existing sessions for that user; reset links are secure and time-limited, delivered within ~2 minutes.
- Rate-limit authentication endpoints (max ~10 attempts/minute). All transport over HTTPS/TLS. CORS restricted to approved domains.
- Social login OAuth flow must complete in under 10 seconds and populate the profile from the provider (name, email, avatar); an existing account with a matching email is linked rather than duplicated.
- On successful registration the user is auto-logged-in, sent a welcome email, and redirected to their originally intended destination (or homepage).
- Email changes in profile require a verification flow before taking effect. Save operations surface success (toast) and validation errors inline.
- Language preference is AR/FR/EN; setting it changes the app language immediately and persists across sessions. Region preference defaults event listings to that region and persists. These may be set before login (device-remembered) and reconciled onto the profile after login.

## Technical Decisions

- Auth provider is NextAuth.js with a JWT (stateless) token strategy — chosen so sessions work with the offline PWA. Redis is the centralized session/rate-limit store. This is inherited baseline architecture and is unchanged by the 2026-06-12 plugin-decomposition amendment.
- User identity lives in Strapi's users-permissions plugin (extended), not a custom plugin. Accounts, profiles, and role assignment are owned there; all other plugins may depend on users-permissions but it depends on none.
- Four auth flows share this layer: B2C email/password + social; B2B email/password with venue-role assignment; Admin email/password with admin role; Guest anonymous browsing with email-only checkout. Roles are seeded/managed via Strapi RBAC.
- API errors return stable error codes (e.g. `SESSION_EXPIRED`), never human-readable prose — the Next.js client translates codes via next-intl. Do not hardcode user-facing auth strings server-side.
- Frontend uses `[locale]` i18n routing with a dedicated `(auth)` protected-route group and an `auth/` area. Full RTL support is required for Arabic; use Western numerals in all locales including Arabic. Language/region preferences integrate with next-intl locale resolution.
- Authenticated user-dashboard/profile views render client-side (CSR, dynamic); public discovery stays cacheable.

## UX & Interaction Patterns

- No forced registration is a core product principle: full discovery and browsing work with no account, and registration is prompted only at the point of purchase. Preserve this — auth gates appear late, never on entry.
- Guest path: at checkout the user chooses guest (email only) or login; after a guest purchase, offer account creation ("create account to see history"), and a "Welcome Back / create account" nudge for returning guests. Account creation is progressive, not a gate.
- Registration success is celebrated (welcome message + brief confetti, ~2s). Password-strength feedback is live; confirm-password validates on blur of the second field.
- The header account slot shows the avatar when signed in and a "Se connecter" affordance otherwise. Profile/My Events area is tab-based (upcoming/past).
- Login/Register form components already exist from the component-library epic (Epic 2A) — reuse them rather than rebuilding; wire them to NextAuth flows here.

## Cross-Story Dependencies

- Epic 4 depends on Epic 2A (component library — login/register forms) and Epic 2B (Strapi foundation, users-permissions) and runs alongside/after Epic 3 (Discovery).
- Epic 4 is the gating foundation for Phase 2 Epics 5 (Watchlist), 6 (Ticketing), and 7 (B2B Venue) — they consume its sessions, roles, and identity.
- Story 4.6 (guest checkout) is functionally coupled to the Ticketing epic's payment flow and to purchase-history; its account-linking outcome is realized when that flow lands. Region preference (4.5) feeds Discovery's region-defaulted listings.
