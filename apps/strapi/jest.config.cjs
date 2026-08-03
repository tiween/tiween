/**
 * Jest config for the Strapi backend.
 *
 * Two Jest projects run side by side under a single `yarn test`:
 *
 * 1. `server` — the backend/node gate.
 *    - Server/unit tests (`*.unit.test.ts`) run on `ts-jest` in a node env with
 *      mocked Strapi — no DB, no boot. These are the must-pass CI gate.
 *    - Integration tests (`*.service.test.ts` / `app.test.js`) boot Strapi via
 *      `tests/helpers/strapi` and exercise SQLite. They are kept separate so a
 *      boot/env failure cannot block the unit gate.
 *
 *    The default `yarn test` run is the unit gate only (`*.unit.test.ts`) so a
 *    DB/boot/env failure in an integration suite can never block it. Run the
 *    boot-based integration suites (the `.service.test.ts` / `.controller.test.ts`
 *    files and `tests/app.test.js`) explicitly, with a live DB and `--runInBand`,
 *    by passing their paths or a `--testMatch` glob on the CLI.
 *
 *    IMPORTANT: a CLI `--testMatch` applies to EVERY project, so it would make
 *    the `admin` project pick the same files up a second time (one file, two
 *    PASS lines, doubled DB access). Always pair it with `--selectProjects`:
 *      npx jest --selectProjects server --testMatch='**\/*.service.test.ts' --runInBand
 *
 * 2. `admin` — the admin-plugin React component gate.
 *    - Runs `*.test.tsx` (the `admin/src/components/__tests__` suites) in a
 *      `jsdom` environment with `@testing-library/react`.
 *    - `tests/setup-jsdom.ts` registers the `@testing-library/jest-dom` matchers.
 *    - `apps/strapi/tsconfig.json` excludes `src/plugins/**\/admin/**` and sets no
 *      `jsx` option, so the ts-jest transform supplies its own inline `tsconfig`
 *      (`jsx: "react-jsx"` plus a DOM lib) rather than inheriting the server one.
 *    - `moduleNameMapper` redirects two things that cannot be loaded for real:
 *      `@strapi/strapi/admin` (importing the real admin bundle pulls in the
 *      ESM-only `fractional-indexing` and fails with `Unexpected token 'export'`)
 *      and stylesheet imports (jest cannot parse CSS).
 *    - `modulePathIgnorePatterns: ["<rootDir>/dist/"]` is required, not merely
 *      nice to have: `dist/` holds compiled copies of `tests/__mocks__/*`, which
 *      jest-haste-map otherwise reports as "duplicate manual mock" warnings.
 *      `testPathIgnorePatterns` alone does not suppress those.
 *
 * NOTE: this config is authored as CommonJS (`.cjs`) on purpose. A `.ts` Jest
 * config requires `ts-node` (absent from this repo) to be parsed; `.cjs` needs
 * no extra dependency while `ts-jest` still compiles the TypeScript test files.
 */

/** Node/backend project — unchanged behaviour, this is the CI unit gate. */
const serverProject = {
  displayName: "server",
  rootDir: ".",
  testEnvironment: "node",
  preset: "ts-jest",
  // Default run = the unit gate only. Boot-based integration suites
  // (`*.service.test.ts`, `*.controller.test.ts`, `tests/app.test.js`) need a
  // live DB and clean serial state, so they are opt-in (see header) rather than
  // part of the default run — this keeps `yarn test` deterministic in CI.
  testMatch: ["**/*.unit.test.ts"],
  // `dist/` holds compiled copies of `tests/__mocks__/*`; without this the
  // haste map reports them as "duplicate manual mock" (testPathIgnorePatterns
  // alone does not suppress it). Server suites only ever import from `src/`,
  // so ignoring the build output changes nothing else.
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
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

/** Admin-plugin React component project — jsdom + testing-library. */
const adminProject = {
  displayName: "admin",
  rootDir: ".",
  testEnvironment: "jsdom",
  testMatch: ["**/*.test.tsx"],
  // See header: suppresses jest-haste-map duplicate-manual-mock warnings from
  // the compiled copies of tests/__mocks__ under dist/.
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup-jsdom.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        // The repo tsconfig excludes admin sources and has no `jsx` setting, so
        // the JSX/DOM compiler options live here instead of being inherited.
        // `isolatedModules` lives in this inline tsconfig rather than alongside
        // `diagnostics` — the ts-jest-level option is deprecated in ts-jest 29
        // and removed in 30.
        tsconfig: {
          isolatedModules: true,
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: "CommonJS",
          moduleResolution: "Node",
          target: "ES2020",
          lib: ["ES2020", "DOM"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "\\.(css|scss|less)$": "<rootDir>/tests/__mocks__/style-mock.ts",
    "^@strapi/strapi/admin$": "<rootDir>/tests/__mocks__/strapi-admin.ts",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.strapi/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  clearMocks: true,
}

module.exports = {
  projects: [serverProject, adminProject],
}
