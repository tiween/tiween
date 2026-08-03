import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * Self-contained backend (node/Strapi) ESLint flat config.
 *
 * Deliberately does NOT consume `@tiween/eslint-config/next` or
 * `/react-internal` (browser/React/Next presets) and never registers
 * `eslint-plugin-only-warn` -- severities configured here are authoritative.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  {
    // `**/`-anchored on purpose: a bare `dist/**` only matches at the app root,
    // so a nested build output (e.g. src/plugins/*/dist/) would be linted and
    // would turn `--max-warnings=0` red on generated code.
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.cache/**",
      "**/.tmp/**",
      "**/.strapi/**",
      "**/node_modules/**",
      "types/generated/**",
      "public/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  // NON-type-checked on purpose: type-aware linting would need
  // parserOptions.project/projectService, is far slower over ~373 files, and
  // errors on files outside the TS project (config/**, scripts/**).
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        // Strapi injects a global `strapi` instance into server-side modules.
        strapi: "readonly",
      },
    },
    rules: {
      // Preserve the legacy .eslintrc.js intent -- the backend tsconfig runs
      // `strict: false` and Strapi's generated types make `any` pervasive.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Mirror the client's underscore-ignore convention.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // CommonJS surfaces: Strapi plugin entrypoints (strapi-server.js /
    // strapi-admin.js) and jest tests/mocks are legitimately CommonJS.
    // Co-located `*.test.ts` / `*.unit.test.ts` files need lazy `require()`
    // to re-import a module after `jest.resetModules()` -- there is no ESM
    // equivalent under ts-jest's CJS transform.
    // `no-require-imports` stays ON for every ESM `.ts` production source.
    // `**/__tests__/**` is included because the repo's convention is a
    // `__tests__/` directory: a fixture/helper in there that is NOT named
    // `*.test.*` would otherwise miss both this relax and the jest globals.
    files: [
      "**/*.js",
      "**/*.cjs",
      "tests/**",
      "**/__tests__/**",
      "**/*.test.*",
      "**/*.unit.test.*",
    ],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Jest/test globals -- same glob set as the CommonJS relax above.
    files: ["tests/**", "**/__tests__/**", "**/*.test.*", "**/*.unit.test.*"],
    languageOptions: { globals: { ...globals.jest } },
  },
  {
    // Admin panel surfaces are React in the browser. `.jsx` is listed so ESLint
    // actually discovers it -- flat config only lints `.js/.cjs/.mjs` by
    // default plus whatever a `files` entry names, and typescript-eslint's
    // globs stop at `.ts/.tsx/.mts/.cts`.
    files: ["src/admin/**", "src/plugins/*/admin/**", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: "readonly",
        JSX: "readonly",
      },
    },
  },
  // MUST be last -- turns off formatting rules that fight `yarn format`.
  prettier,
]
