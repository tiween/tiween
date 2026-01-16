# Brief: Tiween Coming Back Landing Page

**Created**: 2026-01-06
**Type**: Feature
**Status**: Ready for Development
**Effort**: Medium (4-16h)

**Tech Spec**: `_bmad-output/implementation-artifacts/tech-spec-coming-back-landing-page.md`

---

## What We're Building

A personal, emotional landing page at the root URL (`/`) where Ayoub steps out from behind Tiween for the first time to share his mental health journey and announce the platform's return. The page displays a trilingual message (French, Arabic, English) simultaneously on the same page, along with an email capture form integrated with Brevo for launch notifications.

This is Tiween's "we're coming back" announcement - vulnerable, hopeful, and personal.

## Why

- Tiween has been dormant during Ayoub's mental health recovery
- The community deserves transparency about the pause and hope about the return
- First time Ayoub reveals himself as the creator (previously anonymous)
- Need to capture emails for launch notification via Brevo Contacts API

## Key Technical Decisions

1. **Email Collection**: Brevo Contacts API directly (not via Strapi content type) - simpler architecture
2. **Language Display**: All 3 languages stacked on same page (not i18n route switching)
3. **Brevo SDK**: Install `@getbrevo/brevo` in client package (NOT shared from Strapi)
4. **RTL Handling**: Inline `dir` attributes per section since page shows all languages

## Tech Stack

- Next.js 16.1 with React 19
- Tailwind CSS v4
- shadcn/ui components
- Brevo Contacts API (`@getbrevo/brevo`)
- react-hook-form + Zod
- Dark theme only: `tiween-green` (#032523) bg, `tiween-yellow` (#F8EB06) accent

## Files to Create/Modify

| Action | File                                                             |
| ------ | ---------------------------------------------------------------- |
| Create | `apps/client/src/app/[locale]/page.tsx`                          |
| Create | `apps/client/src/app/api/newsletter/subscribe/route.ts`          |
| Create | `apps/client/src/components/landing/ComingBackLanding.tsx`       |
| Create | `apps/client/src/components/landing/NewsletterSubscribeForm.tsx` |
| Modify | `apps/client/src/env.mjs` - add BREVO_API_KEY, BREVO_LIST_ID     |
| Modify | `apps/client/.env.local.example` - document env vars             |
| Modify | `apps/client/package.json` - add @getbrevo/brevo                 |

## Implementation Tasks

1. **Add Brevo SDK and Environment Variables**

   - Add `@getbrevo/brevo` to client dependencies
   - Add BREVO_API_KEY and BREVO_LIST_ID to env.mjs (both optional)
   - Run yarn install

2. **Create Newsletter Subscribe API Route**

   - POST handler with Zod validation
   - Brevo SDK integration for createContact
   - Graceful handling: dev mode without API key, duplicate emails
   - Response codes: INVALID_EMAIL, SUBSCRIPTION_FAILED, DEV_MODE_NO_BREVO

3. **Create Newsletter Subscribe Form Component**

   - Client component with react-hook-form + Zod
   - Dark theme input styling: `bg-surface text-white`
   - Toast feedback via useToast
   - Track isSubmitted state - disable after success

4. **Create Coming Back Landing Component**

   - Server Component with Tiween logo
   - Three language sections with proper dir/lang attributes
   - Font utilities: `font-display` for Latin headings, `font-arabic` for Arabic
   - NewsletterSubscribeForm at bottom
   - Responsive: mobile-first, centered, max-w-2xl

5. **Create Root Landing Page**

   - Simple wrapper rendering ComingBackLanding
   - Metadata: "Tiween - Coming Soon"

6. **Write Trilingual Message Content**
   - Personal message from Ayoub (draft in tech spec)
   - Vulnerable about mental health journey
   - Hopeful about return
   - Final content should be reviewed by Ayoub

## Code Patterns to Follow

```tsx
// Dark theme input override
<Input className="bg-surface text-white placeholder:text-muted-foreground" />

// Button loading state - must manually disable
<Button isLoading={isLoading} disabled={isLoading || isSubmitted}>
  Notify me
</Button>

// Language section structure
<section dir="rtl" lang="ar" className="font-arabic text-center">
  <h2 className="text-2xl mb-4">...</h2>
  <p className="text-muted-foreground leading-relaxed">...</p>
</section>

// API response format
{ success: true }
{ success: false, error: "INVALID_EMAIL" }
{ success: true, warning: "DEV_MODE_NO_BREVO" }
```

## Codebase References

| File                                                      | What to Learn                  |
| --------------------------------------------------------- | ------------------------------ |
| `apps/client/src/components/forms/AppForm.tsx`            | Form wrapper pattern           |
| `apps/client/src/components/forms/AppField.tsx`           | Input with validation          |
| `apps/client/src/components/ui/button.tsx`                | isLoading prop usage           |
| `apps/client/src/components/ui/use-toast.ts`              | Toast notifications            |
| `apps/client/src/env.mjs`                                 | Environment validation pattern |
| `apps/client/src/app/api/public-proxy/[...slug]/route.ts` | API route pattern              |

## Important Notes

- **AppForm/AppField** contain `removeThisWhenYouNeedMe()` dev guards - remove when using
- **Input component** uses light bg by default - override for dark theme
- **BREVO_LIST_ID**: Optional - if not set, contacts created without list assignment (can be manually added in Brevo dashboard later)
- Same page renders for all locale routes (`/en`, `/fr`, `/ar`) - intentional since content is trilingual

## Acceptance Criteria

- All three languages (FR, AR, EN) visible on same page
- Arabic section renders RTL with Arabic font
- Valid email submission creates Brevo contact + success toast
- Invalid email shows client-side validation error
- Duplicate email handled gracefully (treated as success)
- Form disabled after successful submission
- Missing BREVO_API_KEY logs warning, doesn't crash
- Mobile responsive with proper spacing
- SEO metadata: "Tiween - Coming Soon"

## Message Content (Draft)

The tech spec contains draft content in French, Arabic, and English. Key themes:

- First time stepping out from shadows as creator
- Acknowledging supporters who believed in the project
- Vulnerable about mental health forcing a pause
- Hopeful about recovery and return
- Signature: "— Ayoub" / "— أيوب"

**Content should be reviewed/personalized by Ayoub before finalizing.**

---

## Next Steps

1. Run `/bmad:bmm:workflows:quick-dev` with the tech spec to start implementation
2. Review and finalize message content with Ayoub
3. Test Brevo integration with real API key
4. Mobile testing especially for Arabic RTL section
