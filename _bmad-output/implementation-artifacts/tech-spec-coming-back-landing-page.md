---
title: "Tiween Coming Back Landing Page"
slug: "coming-back-landing-page"
created: "2026-01-04"
status: "review"
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    "Next.js 16.1",
    "React 19",
    "Tailwind CSS v4",
    "shadcn/ui",
    "Brevo Contacts API",
    "Zod",
    "react-hook-form",
  ]
files_to_modify:
  - "apps/client/src/app/[locale]/page.tsx (create)"
  - "apps/client/src/app/api/newsletter/subscribe/route.ts (create)"
  - "apps/client/src/components/landing/ComingBackLanding.tsx (create)"
  - "apps/client/src/components/landing/NewsletterSubscribeForm.tsx (create)"
  - "apps/client/src/env.mjs (modify - add BREVO_API_KEY to server + runtimeEnv)"
  - "apps/client/.env.local.example (modify - add BREVO_API_KEY)"
  - "apps/client/package.json (modify - add @getbrevo/brevo dependency)"
code_patterns:
  - "Server Components by default, 'use client' only when needed"
  - "API routes use Next.js Route Handlers (app/api/*/route.ts)"
  - "Forms use react-hook-form + zod + AppForm/AppField components"
  - "Buttons have isLoading prop for pending states"
  - "Dark theme only - tiween-green (#032523) background, tiween-yellow (#F8EB06) accent"
  - "Typography: font-display for headings (Lalezar), font-arabic for Arabic text"
test_patterns:
  - "Co-located tests: Component.test.tsx next to Component.tsx"
  - "Vitest for unit tests"
---

# Tech-Spec: Tiween Coming Back Landing Page

**Created:** 2026-01-04

## Overview

### Problem Statement

Tiween has been dormant while the creator (Ayoub) navigated a difficult mental health period. The community that has supported the project deserves transparency about the pause and hope about the return - plus a way to stay connected for the relaunch. This is also the first time Ayoub steps out from behind the project to reveal himself as the person who built it.

### Solution

A personal landing page at the root `/` where Ayoub steps out from the shadow for the first time, shares his journey honestly (vulnerability → hope), and captures emails via Brevo Contacts API for launch notifications. The message will be displayed in all three languages (AR/FR/EN) on the same page simultaneously.

### Scope

**In Scope:**

- Landing page at `apps/client/src/app/[locale]/page.tsx`
- Personal message from Ayoub - first time revealing himself as the creator
- Message acknowledges the supporters who were always there
- Tone: vulnerable about the hard months → hopeful about recovery and return
- All three languages (AR/FR/EN) displayed on the same page (not switched)
- Email subscription form integrated with Brevo Contacts API
- Mobile-responsive, clean design using existing Tiween design tokens

**Out of Scope:**

- Language switching for the message (all visible at once)
- Full app takeover / route redirects (root only)
- Strapi content type for subscribers (Brevo directly)
- Complex animations or hero images
- Navbar/footer implementation

## Context for Development

### Codebase Patterns

**Component Structure:**

- Server Components by default, `'use client'` directive only for interactivity
- shadcn/ui components in `components/ui/` (Button, Input, etc.)
- Form components: `AppForm`, `AppField` wrap react-hook-form with Zod validation
  - **NOTE**: These components contain `removeThisWhenYouNeedMe()` dev guards - remove the guard calls when using them to avoid console spam
- Button supports `isLoading` prop that shows Spinner component (does NOT auto-disable - add `disabled` prop manually during loading)

**Styling:**

- Dark-only theme: `tiween-green` (#032523) background, `tiween-yellow` (#F8EB06) for CTAs
- Tailwind v4 with `@theme` directive in `theme.css`
- CSS variables for shadcn: `--background`, `--foreground`, `--primary`, etc.
- Font utilities: `font-display` (Lalezar for Latin headings), `font-arabic` (Noto Sans Arabic for Arabic text including headings)
- **NOTE**: Default Input component uses `bg-gray-100` (light) - override with `className="bg-surface text-white"` for dark theme consistency

**API Routes:**

- Route Handlers in `app/api/*/route.ts`
- Export named functions: `GET`, `POST`, etc.
- Use `NextResponse.json()` for responses
- Environment validation with `@t3-oss/env-nextjs`

**i18n:**

- Locales in `apps/client/locales/{en,fr,ar}.json`
- next-intl for translations
- For this page: hardcoded trilingual text (not using i18n switching)

### Files to Reference

| File                                                      | Purpose                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/client/src/app/[locale]/layout.tsx`                 | Root layout with providers, fonts, theme                                  |
| `apps/client/src/components/forms/AppForm.tsx`            | Form wrapper with react-hook-form                                         |
| `apps/client/src/components/forms/AppField.tsx`           | Input field with validation                                               |
| `apps/client/src/components/ui/button.tsx`                | Button with isLoading, variants                                           |
| `apps/client/src/components/ui/input.tsx`                 | Base input component                                                      |
| `apps/client/src/app/api/public-proxy/[...slug]/route.ts` | API route pattern example                                                 |
| `apps/client/src/env.mjs`                                 | Environment variable validation (add to `server` + `runtimeEnv` sections) |
| `apps/client/src/styles/globals.css`                      | CSS variables, dark theme                                                 |
| `apps/client/src/components/ui/use-toast.ts`              | Toast hook for feedback notifications                                     |
| `apps/client/public/images/logo.svg`                      | Tiween logo asset                                                         |
| `apps/strapi/.env.example`                                | Brevo API key already documented here                                     |

### Technical Decisions

- **Email collection**: Brevo Contacts API directly (Option B) - simpler, no Strapi content type needed
- **Language display**: All three languages stacked on same page (not i18n route switching)
- **Routing**: Root page only (`/`), other routes remain accessible
- **Brevo SDK**: Install `@getbrevo/brevo` in client package.json (NOT shared from Strapi - each app needs its own)
- **API Key**: Reuse `BREVO_API_KEY` value from Strapi, add to client env
- **BREVO_LIST_ID behavior**: If not set, contacts are created without list assignment. This is acceptable for "coming soon" - contacts can be manually added to a list in Brevo dashboard later. If set, contacts are auto-added to the specified list.
- **RTL handling**: The root layout sets `dir` based on locale, but since this page shows all 3 languages, each language section uses inline `dir` attribute: `<div dir="rtl">` for Arabic, `<div dir="ltr">` for French/English

## Implementation Plan

### Tasks

- [x] **Task 1: Add Brevo SDK and Environment Variables**

  - File: `apps/client/package.json`
  - Action: Add `"@getbrevo/brevo": "^3.0.1"` to dependencies
  - Command: Run `yarn install` from project root after adding
  - File: `apps/client/src/env.mjs`
  - Action: Add to `server` schema section:
    ```javascript
    BREVO_API_KEY: z.string().optional(),
    BREVO_LIST_ID: z.coerce.number().optional(),
    ```
  - Action: Add to `runtimeEnv` section:
    ```javascript
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_LIST_ID: process.env.BREVO_LIST_ID,
    ```
  - File: `apps/client/.env.local.example`
  - Action: Add with comments:
    ```
    # Brevo (Newsletter signup)
    BREVO_API_KEY=your-brevo-api-key
    BREVO_LIST_ID=  # Optional: Brevo list ID for coming-soon subscribers
    ```

- [x] **Task 2: Create Brevo Newsletter Subscribe API Route**

  - File: `apps/client/src/app/api/newsletter/subscribe/route.ts` (create)
  - Action: Implement POST handler that:
    1. Validates email with Zod schema (see schema below)
    2. Initializes Brevo SDK with `BREVO_API_KEY` from `env`
    3. Creates/updates contact via `contactsApi.createContact()` (idempotent - handles duplicates)
    4. If `BREVO_LIST_ID` is set, include in `listIds` array
    5. Returns success/error response with appropriate status codes
  - **Zod Schema**:
    ```typescript
    const subscribeSchema = z.object({
      email: z.string().email(),
    })
    ```
  - **Response Format**:

    ```typescript
    // Success (200)
    { success: true }

    // Validation Error (400)
    { success: false, error: "INVALID_EMAIL" }

    // Brevo Error (500)
    { success: false, error: "SUBSCRIPTION_FAILED" }

    // Dev mode - no API key (200 with warning)
    { success: true, warning: "DEV_MODE_NO_BREVO" }
    ```

  - **Error Code Mapping** (for client-side toast messages):
    | Code | User Message |
    |------|--------------|
    | `INVALID_EMAIL` | "Please enter a valid email address" |
    | `SUBSCRIPTION_FAILED` | "Something went wrong. Please try again." |
  - Notes:
    - Log actual Brevo errors server-side but don't expose to client
    - Brevo `createContact` with existing email just updates - no special handling needed

- [x] **Task 3: Create Newsletter Subscribe Form Component**

  - File: `apps/client/src/components/landing/NewsletterSubscribeForm.tsx` (create)
  - Action: Create client component with:
    1. Email input using shadcn Input with dark override: `className="bg-surface text-white placeholder:text-muted-foreground"`
    2. Submit button with `isLoading` AND `disabled={isLoading || isSubmitted}` props
    3. react-hook-form + Zod for client-side validation (same schema as API)
    4. fetch to `/api/newsletter/subscribe` on submit
    5. Toast feedback using `useToast` from `@/components/ui/use-toast`
    6. Track `isSubmitted` state - disable form permanently after success
  - **Toast Messages**:
    - Success: `{ title: "You're in!", description: "We'll notify you when we launch." }`
    - Error (INVALID_EMAIL): `{ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" }`
    - Error (other): `{ title: "Something went wrong", description: "Please try again later", variant: "destructive" }`
  - Notes:
    - Use `'use client'` directive
    - Placeholder: `"Enter your email"`
    - Button text: `"Notify me"` (or just arrow icon like existing NewsletterForm)

- [x] **Task 4: Create Coming Back Landing Component**

  - File: `apps/client/src/components/landing/ComingBackLanding.tsx` (create)
  - Action: Create Server Component with:
    1. Tiween logo at top: `<Image src="/images/logo.svg" alt="Tiween" width={120} height={40} />`
    2. Personal message from Ayoub in three sections (FR/AR/EN)
    3. Each language section with appropriate font and direction styling
    4. NewsletterSubscribeForm at bottom
    5. Responsive layout (mobile-first, centered, max-w-2xl)
  - **Section Structure**:

    ```tsx
    {
      /* French Section */
    }
    ;<section dir="ltr" lang="fr" className="text-center">
      <h2 className="font-display text-2xl mb-4">...</h2>
      <p className="text-muted-foreground leading-relaxed">...</p>
    </section>

    {
      /* Separator */
    }
    ;<div className="w-16 h-px bg-border mx-auto my-8" />

    {
      /* Arabic Section */
    }
    ;<section dir="rtl" lang="ar" className="font-arabic text-center">
      <h2 className="text-2xl mb-4">...</h2>
      <p className="text-muted-foreground leading-relaxed">...</p>
    </section>

    {
      /* Separator */
    }
    ;<div className="w-16 h-px bg-border mx-auto my-8" />

    {
      /* English Section */
    }
    ;<section dir="ltr" lang="en" className="text-center">
      <h2 className="font-display text-2xl mb-4">...</h2>
      <p className="text-muted-foreground leading-relaxed">...</p>
    </section>
    ```

  - **Accessibility**: Each section has `lang` attribute for screen readers

- [x] **Task 5: Create Root Landing Page**

  - File: `apps/client/src/app/[locale]/page.tsx` (create)
  - Action: Create page that renders ComingBackLanding component
  - **Metadata**:
    ```typescript
    export const metadata: Metadata = {
      title: "Tiween - Coming Soon",
      description:
        "Tiween is coming back. Subscribe to be notified when we launch.",
    }
    ```
  - Notes:
    - Simple Server Component wrapper
    - The same page renders for all 3 locale routes (`/en`, `/fr`, `/ar`) - this is intentional as content is trilingual
    - Consider adding `<link rel="canonical" href="/fr" />` to avoid duplicate content SEO issues (optional)

- [ ] **Task 6: Write Message Content (Trilingual)**

  - File: `apps/client/src/components/landing/ComingBackLanding.tsx`
  - Action: Add the actual message content in FR/AR/EN
  - **IMPORTANT**: This is a personal message from Ayoub. The developer should use the placeholder structure below, but **final content should be reviewed/written by Ayoub**.
  - **Draft Structure** (developer can use as starting point):

    **French (Primary):**

    ```
    Titre: "Un message personnel"

    Depuis le début de Tiween, je suis resté dans l'ombre. Beaucoup d'entre vous
    ont soutenu ce projet sans jamais savoir qui était derrière. Aujourd'hui,
    je sors de cette ombre pour vous parler directement.

    Ces derniers mois ont été difficiles. Ma santé mentale m'a obligé à faire
    une pause. J'ai dû prendre du recul, me soigner, et accepter que parfois,
    il faut savoir s'arrêter.

    Aujourd'hui, je vais mieux. Pas parfaitement, mais mieux. Et je reprends
    doucement le travail sur Tiween. Une nouvelle version arrive.

    Merci à tous ceux qui ont attendu. Merci à ceux qui ont cru en ce projet.

    — Ayoub
    ```

    **Arabic:**

    ```
    العنوان: "رسالة شخصية"

    منذ بداية تيوين، بقيت في الظل. كثيرون منكم دعموا هذا المشروع دون أن
    يعرفوا من يقف وراءه. اليوم، أخرج من هذا الظل لأتحدث إليكم مباشرة.

    الأشهر الماضية كانت صعبة. صحتي النفسية أجبرتني على التوقف. كان علي
    أن أتراجع، أن أعتني بنفسي، وأن أقبل أنه أحياناً يجب أن نتوقف.

    اليوم، أنا أفضل. ليس تماماً، لكن أفضل. وأعود ببطء للعمل على تيوين.
    نسخة جديدة قادمة.

    شكراً لكل من انتظر. شكراً لكل من آمن بهذا المشروع.

    — أيوب
    ```

    **English:**

    ```
    Title: "A Personal Message"

    Since Tiween began, I've stayed in the shadows. Many of you supported this
    project without ever knowing who was behind it. Today, I'm stepping out
    to speak to you directly.

    These past months have been hard. My mental health forced me to pause.
    I had to step back, take care of myself, and accept that sometimes you
    need to stop.

    Today, I'm better. Not perfect, but better. And I'm slowly getting back
    to work on Tiween. A new version is coming.

    Thank you to everyone who waited. Thank you to those who believed.

    — Ayoub
    ```

  - Notes:
    - Content is placeholder/draft - Ayoub should review and personalize
    - Keep paragraphs short for mobile readability
    - Signature "— Ayoub" / "— أيوب" at end of each

### Acceptance Criteria

- [ ] **AC1**: Given the landing page loads, when the user views the page, then they see the personal message displayed in all three languages (FR, AR, EN) on the same page
- [ ] **AC2**: Given the Arabic section, when rendered, then it displays with RTL text direction and Arabic font styling
- [ ] **AC3**: Given a valid email address, when the user submits the form, then the email is created/updated in Brevo contacts and a success toast appears
- [ ] **AC4**: Given an invalid email format, when the user attempts to submit, then client-side validation prevents submission and shows an error
- [ ] **AC5**: Given the email is already subscribed, when submitting again, then the API returns gracefully (no error shown to user, treated as success)
- [ ] **AC6**: Given the form is submitted successfully, when the success state is shown, then the form input is disabled to prevent duplicate submissions
- [ ] **AC7**: Given the BREVO_API_KEY is not configured, when the API is called, then it logs a warning and returns a dev-friendly response (not a crash)
- [ ] **AC8**: Given the page is viewed on mobile, when rendered, then the layout is responsive and readable with appropriate spacing
- [ ] **AC9**: Given the page metadata, when search engines crawl, then they see appropriate title ("Tiween - Coming Soon") and description

## Additional Context

### Dependencies

**New Package:**

- `@getbrevo/brevo` - Brevo SDK for Contacts API (add to client package.json)

**Environment Variables (client):**

- `BREVO_API_KEY` - API key for Brevo (reuse from Strapi)
- `BREVO_LIST_ID` - Optional: Brevo contact list ID for "Coming Soon" subscribers

### Testing Strategy

**Unit Tests** (co-located with components):

- `apps/client/src/app/api/newsletter/subscribe/route.test.ts`
  - Test Zod schema validation (valid/invalid emails)
  - Test response format for each case
  - Mock `@getbrevo/brevo` SDK

**Manual E2E Testing**:

1. Load page at `/fr` - verify all 3 languages visible
2. Submit valid email - verify success toast, form disabled
3. Submit same email again - verify still succeeds (idempotent)
4. Submit invalid email - verify client-side error
5. Check Brevo dashboard - verify contact created
6. Test on mobile (iOS Safari, Android Chrome) - verify RTL Arabic section

### Notes

- Brevo email provider already configured in Strapi (Story 2B.12) - can reuse same API key
- Existing `NewsletterForm` component pattern available but this will be a fresh, simpler implementation focused on this landing page
- **Content**: Personal message from Ayoub - first time stepping out as creator, acknowledging supporters, vulnerable about mental health journey, hopeful about return
- **Design**: Clean, centered, emotional - dark background, yellow CTA, all three languages visible

### Risks & Mitigations

| Risk                        | Mitigation                                                                |
| --------------------------- | ------------------------------------------------------------------------- |
| Brevo API rate limits       | Use createOrUpdateContact (idempotent) to handle resubmissions gracefully |
| Message tone feels off      | Task 6 can be iterated - content separate from technical implementation   |
| Mobile RTL rendering issues | Test Arabic section specifically on mobile Safari/Chrome                  |

### Out of Scope (Future Considerations)

- Social sharing buttons
- Countdown timer to launch
- Background animation/video
- Integration with Strapi for editable content
