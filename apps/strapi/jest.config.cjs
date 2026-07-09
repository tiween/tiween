/**
 * Jest config for the Strapi backend.
 *
 * - Server/unit tests (`*.unit.test.ts`) run on `ts-jest` in a node env with
 *   mocked Strapi — no DB, no boot. These are the must-pass CI gate.
 * - Integration tests (`*.service.test.ts` / `app.test.js`) boot Strapi via
 *   `tests/helpers/strapi` and exercise SQLite. They are kept separate so a
 *   boot/env failure cannot block the unit gate.
 *
 * The default `yarn test` run is the unit gate only (`*.unit.test.ts`) so a
 * DB/boot/env failure in an integration suite can never block it. Run the
 * boot-based integration suites (the `.service.test.ts` / `.controller.test.ts`
 * files and `tests/app.test.js`) explicitly, with a live DB and `--runInBand`,
 * by passing their paths or a `--testMatch` glob on the CLI.
 *
 * NOTE: this config is authored as CommonJS (`.cjs`) on purpose. A `.ts` Jest
 * config requires `ts-node` (absent from this repo) to be parsed; `.cjs` needs
 * no extra dependency while `ts-jest` still compiles the TypeScript test files.
 */
module.exports = {
  displayName: "server",
  rootDir: ".",
  testEnvironment: "node",
  preset: "ts-jest",
  // Default run = the unit gate only. Boot-based integration suites
  // (`*.service.test.ts`, `*.controller.test.ts`, `tests/app.test.js`) need a
  // live DB and clean serial state, so they are opt-in (see header) rather than
  // part of the default run — this keeps `yarn test` deterministic in CI.
  testMatch: ["**/*.unit.test.ts"],
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
