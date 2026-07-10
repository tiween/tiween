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
    // Inline the React-consuming UI deps so Vite (not node's externalized
    // require) resolves their React through the single aliased copy above.
    server: {
      deps: {
        inline: [
          /@testing-library\//,
          /@radix-ui\//,
          /react-day-picker/,
          /cmdk/,
          /@floating-ui\//,
        ],
      },
    },
    include: [
      "src/features/events/utils/**/*.test.ts",
      // Watchlist add/sync hooks (Story 5.1).
      "src/features/events/hooks/**/*.test.ts",
      // FilmHero disabled/pulse behavior (Story 5.1).
      "src/features/events/components/FilmHero/**/*.test.tsx",
      // EventDetailPage toggle wiring + in-flight guard (Story 5.2).
      "src/features/events/components/EventDetailPage/**/*.test.tsx",
      // Watchlist page composition + seed-then-remove wiring (Story 5.3).
      // `[locale]` is a glob char-class, so match the segment via `**`.
      "src/app/**/watchlist/**/*.test.tsx",
      "src/features/events/filters/**/*.test.ts",
      "src/features/events/components/EventDateFilter/**/*.test.tsx",
      "src/features/events/components/EventLocationFilter/**/*.test.tsx",
      "src/features/events/components/EventVenueFilter/**/*.test.tsx",
      "src/features/events/components/ShareDialog/**/*.test.tsx",
      "src/lib/strapi-api/**/*.test.ts",
      "src/lib/algolia/**/*.test.ts",
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
      "src/app/**/change-email/_components/**/*.test.tsx",
    ],
  },
})
