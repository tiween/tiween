# Epic 4: User Authentication & Profiles

Users can register, login, manage their profiles, and set preferences for language and region.

## Story 4.1: Email and Password Registration

As a **visitor**,
I want to register with my email and password,
So that I can save watchlist items and purchase tickets.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I enter my name, email, and password
**Then** form validation checks:
- Email format is valid
- Password meets strength requirements (8+ chars, mixed case, number)
- Confirm password matches
**And** on submit, my account is created in Strapi
**And** I receive a welcome email
**And** I am automatically logged in
**And** I am redirected to my intended destination or homepage

---

## Story 4.2: Social Login with Google and Facebook

As a **visitor**,
I want to login with my Google or Facebook account,
So that I can register quickly without creating a new password.

**Acceptance Criteria:**

**Given** I am on the login or registration page
**When** I tap "Continue with Google" or "Continue with Facebook"
**Then** I am redirected to the OAuth provider
**And** after authorization, my account is created or linked
**And** my profile is populated with data from the provider (name, email, avatar)
**And** I am logged in and redirected to my destination
**And** the OAuth flow completes in under 10 seconds (NFR-IN4)

---

## Story 4.3: Password Reset Flow

As a **user**,
I want to reset my password if I forget it,
So that I can regain access to my account.

**Acceptance Criteria:**

**Given** I tap "Forgot password" on the login page
**When** I enter my email address
**Then** I receive a password reset email within 2 minutes
**And** the email contains a secure, time-limited reset link
**And** clicking the link takes me to a password reset form
**And** I can enter and confirm a new password
**And** after reset, I am logged in automatically
**And** old sessions are invalidated

---

## Story 4.4: Profile Management

As an **authenticated user**,
I want to view and update my profile information,
So that my account reflects accurate information.

**Acceptance Criteria:**

**Given** I am logged in and on my profile page
**When** I update my profile
**Then** I can change my display name
**And** I can upload or change my avatar
**And** I can see my email (editable with verification flow)
**And** changes are saved to Strapi
**And** I see a success toast on save
**And** validation errors show inline

---

## Story 4.5: Language and Region Preferences

As an **authenticated user**,
I want to set my preferred language and default region,
So that the app shows content relevant to me.

**Acceptance Criteria:**

**Given** I am on my profile/settings page
**When** I set my language preference (AR/FR/EN)
**Then** the app language changes immediately
**And** my preference is saved to my profile
**And** the preference persists across sessions
**When** I set my default region
**Then** event listings default to that region
**And** the preference is saved and persists

---

## Story 4.6: Guest Checkout Capability

As a **visitor**,
I want to purchase tickets without creating an account,
So that I can complete my purchase quickly.

**Acceptance Criteria:**

**Given** I am in the checkout flow without being logged in
**When** I choose to checkout as guest
**Then** I only need to provide my email address
**And** I complete the payment flow normally
**And** I receive my tickets via email
**And** I am offered to create an account after purchase
**And** if I later create an account with that email, my purchase history is linked

---
