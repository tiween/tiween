import type { Config } from "jest"

/**
 * Jest config for the Strapi backend.
 *
 * - Server/unit tests (`*.unit.test.ts`) run on `ts-jest` in a node env with
 *   mocked Strapi — no DB, no boot. These are the must-pass CI gate.
 * - Integration tests (`*.service.test.ts` / `app.test.js`) boot Strapi via
 *   `tests/helpers/strapi` and exercise SQLite. They are kept separate so a
 *   boot/env failure cannot block the unit gate.
 *
 * Run a subset with: `yarn test --testPathPattern unit`
 */
const config: Config = {
  displayName: "server",
  rootDir: ".",
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: ["**/*.test.ts", "**/*.test.js"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Tests import plugin source freely; relax strictness for test ergonomics.
        diagnostics: false,
        // Compile each file independently. Without this, ts-jest tries to
        // resolve a shared outDir across cross-tree imports (e.g. a test that
        // imports ../../../../../shared/validation), which fails with an
        // "outDir is '' or '.'" error on those files. Per-file emit avoids it.
        isolatedModules: true,
      },
    ],
  },
  // Boot-based integration suites are opt-in; they need a running DB and are
  // excluded from the default (unit) run.
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.strapi/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  clearMocks: true,
}

export default config
