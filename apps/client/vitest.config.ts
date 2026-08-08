import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

/**
 * Vitest runner for @tiween/client (wired in Story 3.1b).
 *
 * `server-only` is aliased to a no-op stub so server-only modules (the Strapi
 * fetchers) can be imported in the node/jsdom test environment. Path alias `@`
 * mirrors tsconfig.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The monorepo hoists React 18 to the repo root while @tiween/client uses
    // React 19; dedupe so the JSX runtime and react-dom render with one copy
    // (otherwise component tests hit an element-shape mismatch).
    dedupe: ["react", "react-dom"],
    alias: {
      // The monorepo hoists React 18 to the repo root while @tiween/client's own
      // node_modules has React 19. Externalized test deps (testing-library,
      // radix) node-resolve the hoisted 18, so pin every React entry point to
      // that same 18 copy and inline the React-consuming UI deps below — one
      // React everywhere, no element-shape / null-dispatcher render mismatch.
      // (The app builds & runs on 19; this alias is test-env only.)
      // NOTE: order matters — Vite string aliases prefix-match (`react` also
      // matches `react/jsx-runtime`), so the specific subpaths MUST come before
      // the bare `react` / `react-dom` entries.
      "react/jsx-runtime": fileURLToPath(
        new URL("../../node_modules/react/jsx-runtime.js", import.meta.url)
      ),
      "react/jsx-dev-runtime": fileURLToPath(
        new URL("../../node_modules/react/jsx-dev-runtime.js", import.meta.url)
      ),
      "react-dom/client": fileURLToPath(
        new URL("../../node_modules/react-dom/client.js", import.meta.url)
      ),
      "react-dom/test-utils": fileURLToPath(
        new URL("../../node_modules/react-dom/test-utils.js", import.meta.url)
      ),
      "react-dom": fileURLToPath(
        new URL("../../node_modules/react-dom/index.js", import.meta.url)
      ),
      react: fileURLToPath(
        new URL("../../node_modules/react/index.js", import.meta.url)
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Registers @testing-library/jest-dom matchers (toBeInTheDocument,
    // toBeDisabled, …). Additive-only; native matchers are unaffected.
    setupFiles: ["./test/setup.ts"],
    // Inline the React-consuming UI deps so Vite (not node's externalized
    // require) resolves their React through the single aliased copy above.
    server: {
      deps: {
        inline: [
          /@testing-library\//,
          /@radix-ui\//,
          /@phosphor-icons\//,
          /react-day-picker/,
          /cmdk/,
          /@floating-ui\//,
        ],
      },
    },
    include: [
      // Route-level files that sit directly under `src/app` (sitemap, robots).
      // Without this line no glob below reaches them — `src/app/**/page.test.tsx`
      // needs the `page` basename and `src/app/api/**` needs the `api` segment,
      // so a `src/app/sitemap.test.ts` would silently never run.
      "src/app/*.test.ts",
      "src/features/events/utils/**/*.test.ts",
      // Contribute-route Strapi payload contract (DW-10).
      "src/app/api/**/*.test.ts",
      // Contribute wizard schemas — incl. the legacy-draft video migration (DW-10).
      "src/features/contribute/schemas/**/*.test.ts",
      // Watchlist add/sync hooks (Story 5.1).
      "src/features/events/hooks/**/*.test.ts",
      // Notification data-layer hooks (Story 5.6).
      "src/features/notifications/**/*.test.ts",
      // EventCard disabled-heart + tooltip (Story 5.4).
      "src/features/events/components/EventCard/**/*.test.tsx",
      // formatRelativeTime (Story 5.4).
      "src/lib/dates.test.ts",
      // Purchase-gate flag + its path predicate (Story 3.12).
      "src/lib/feature-flags.test.ts",
      "src/lib/feature-flags.env.test.ts",
      // Every layer of the Next proxy: purchase gate (3.12), `/venue` auth
      // gate (7.3), matcher coverage, and the HTTPS redirect.
      "src/proxy.flag.test.ts",
      // Shared sign-out path — per-user watchlist cache eviction (Story 5.8),
      // plus the server branch of the query client that eviction depends on.
      // (The provider-wiring test is already covered by the
      // `src/components/providers/**` glob further down.)
      "src/lib/sign-out.test.ts",
      "src/lib/query-client.test.ts",
      // NextAuth's configured sign-out route (Story 5.8). `[locale]` is a glob
      // char-class, so match the segment via `**`.
      "src/app/**/signout/**/*.test.tsx",
      // Western-numeral guard (Story 1.12): the shared locale helper, plus the
      // catalog-wide ICU gate that renders every ar.json message at
      // `ar-u-nu-arab` and rejects Arabic-Indic output.
      "src/lib/intl-locale.test.ts",
      "src/lib/icu-numerals.test.ts",
      // FilmHero disabled/pulse behavior (Story 5.1).
      "src/features/events/components/FilmHero/**/*.test.tsx",
      // EventDetailPage toggle wiring + in-flight guard (Story 5.2).
      "src/features/events/components/EventDetailPage/**/*.test.tsx",
      // Short-film detail page — conditional-section omission + share
      // fallbacks (2026 design handoff).
      "src/features/shorts/components/ShortFilmDetail/**/*.test.tsx",
      // Watchlist page composition + seed-then-remove wiring (Story 5.3).
      // `[locale]` is a glob char-class, so match the segment via `**`.
      "src/app/**/watchlist/**/*.test.tsx",
      "src/features/events/filters/**/*.test.ts",
      "src/features/events/components/EventDateFilter/**/*.test.tsx",
      "src/features/events/components/EventLocationFilter/**/*.test.tsx",
      "src/features/events/components/EventVenueFilter/**/*.test.tsx",
      // Category tabs wrapper + listing island URL writes (Story 3.2).
      "src/features/events/components/EventCategoryFilter/**/*.test.tsx",
      "src/features/events/components/EventsListing/**/*.test.tsx",
      // `/[locale]/events` route param forwarding (Story 3.2). `[locale]` is a
      // glob char-class, so match the segment via `**`.
      "src/app/**/events/*.test.tsx",
      // Server-route → client-island prop serializability guards. Covers the
      // `/[locale]` homepage (the reported "Functions cannot be passed directly
      // to Client Components" crash site); `[locale]` is a glob char-class, so
      // match the segment via `**`.
      "src/app/**/page.test.tsx",
      "src/features/events/components/ShareDialog/**/*.test.tsx",
      "src/lib/strapi-api/**/*.test.ts",
      "src/lib/algolia/**/*.test.ts",
      // SEO JSON-LD structured data (offer availability from `soldOut`).
      "src/lib/seo/**/*.test.ts",
      // Region read-back helper (Story 4.5).
      "src/hooks/**/*.test.ts",
      // Language-preference sync provider (Story 4.5).
      "src/components/providers/**/*.test.tsx",
      // Auth register form. `[locale]` in the path is a glob character class,
      // so match via `**` rather than spelling the segment literally.
      "src/app/**/register/_components/**/*.test.tsx",
      // Auth sign-in form with social login (Story 4.2).
      "src/app/**/signin/_components/**/*.test.tsx",
      // Auth password-reset + forgot-password forms (Story 4.3).
      "src/app/**/reset-password/_components/**/*.test.tsx",
      "src/app/**/forgot-password/_components/**/*.test.tsx",
      // Profile management + email-change confirmation (Story 4.4).
      "src/app/**/profile/_components/**/*.test.tsx",
      // Profile page composition — sync section mount (Story 5.5). The test sits
      // at the `profile/` root, not `_components/`, so it needs its own glob.
      "src/app/**/profile/**/*.test.tsx",
      "src/app/**/change-email/_components/**/*.test.tsx",
      // Notifications page + item components (Story 5.6). `[locale]` is a glob
      // char-class, so match the segment via `**`.
      "src/app/**/notifications/**/*.test.tsx",
      // BottomNav account-tab badge (Story 5.6).
      "src/components/layout/**/*.test.tsx",
      // Ticket types + prices: formatPrice util, useTicketTiers hook,
      // TicketTypeList component (Story 6.1).
      "src/features/tickets/**/*.test.ts",
      "src/features/tickets/**/*.test.tsx",
      // Tickets route client children — TicketTypesSection state routing
      // (Story 6.1), the payment result view (6.3) and "Mes Billets" (6.4).
      // `[locale]` etc. are glob char-classes, so match via `**`.
      "src/app/**/tickets/**/*.test.tsx",
      // Venue registration schema + form (Story 7.1). `[locale]` is a glob
      // char-class, so match the segment via `**`.
      "src/features/venues/**/*.test.ts",
      // Venue feature COMPONENTS (Story 7.2) — the location picker island. The
      // `.test.ts` glob above does NOT reach a `.test.tsx` file, so without
      // this line a component test added under `features/venues/` would sit
      // there silently never running.
      "src/features/venues/**/*.test.tsx",
      "src/app/**/venues/**/*.test.tsx",
      // Venue-manager profile dashboard (Story 7.2). The segment is `venue/`
      // (singular) — the `venues/` glob above does NOT reach it — and `[locale]`
      // is a glob char-class, so match that segment via `**`.
      "src/app/**/venue/profile/**/*.test.tsx",
      // Venue-manager event creation surfaces (Story 7.3). The profile glob
      // above is pinned to `profile/` only, so the events pages need their own.
      "src/app/**/venue/events/**/*.test.tsx",
    ],
  },
})
