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
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/features/events/utils/**/*.test.ts",
      "src/lib/strapi-api/**/*.test.ts",
    ],
  },
})
