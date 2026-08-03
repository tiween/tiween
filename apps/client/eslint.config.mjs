// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import nextConfig from "@tiween/eslint-config/next"
import tiweenPlugin from "@tiween/eslint-config/plugin"
import storybook from "eslint-plugin-storybook"
import tseslint from "typescript-eslint"

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@tiween": tiweenPlugin,
    },
    rules: {
      // "Arabic must render Western numerals" (project-context.md:110, :173) is a
      // recurring defect (stories 5.4 and 5.5) that no runtime test can catch on
      // this toolchain — Node 22 / ICU 77 already resolves `ar` to `latn`, so the
      // bug is invisible locally and only appears on an ICU build where `ar`
      // defaults to `arab`. Enforced statically instead, workspace-wide with no
      // test/story exemption: every Intl formatter and toLocale*String call must
      // receive a provably Latin-numeral locale (a `fr`/`en` literal, an explicit
      // `-u-nu-latn`, or `toNumeralSafeLocale(...)` from `@/lib/intl-locale`).
      "@tiween/western-numerals": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@next/next/no-html-link-for-pages": "off",
      // Use TypeScript-aware no-unused-vars rule instead of base ESLint rule
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react/function-component-definition": "off",
      "react/hook-use-state": "off",
      "react/jsx-no-leaked-render": "off",
      "react/jsx-sort-props": "off",
      "react/no-array-index-key": "off",
      "react/no-unstable-nested-components": [
        "warn",
        {
          allowAsProps: true,
          customValidators: [],
        },
      ],
      "turbo/no-undeclared-env-vars": "off",
      "no-extra-boolean-cast": "warn",
      "jsx-a11y/alt-text": [
        "error",
        {
          elements: ["img", "object", "area", "input[type='image']"],
          img: ["Image"],
          object: ["Object"],
          area: ["Area"],
          "input[type='image']": ["InputImage"],
        },
      ],
      "jsx-a11y/no-autofocus": "off",
    },
  },
  {
    files: ["src/components/ui/*.tsx"],
    rules: {
      "react/jsx-curly-brace-presence": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.stories.@(ts|tsx)"],
    rules: {
      // Storybook arg handlers demonstrate callbacks by logging them; that is the
      // documented CSF idiom and these files never ship to production.
      "no-console": "off",
      // Stories are isolated component fixtures rendered by Storybook, not Next.js
      // pages -- the LCP/bandwidth rationale for next/image does not apply, and
      // remote placeholder art has no known intrinsic dimensions.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      // Route handlers run on the server and have no structured logger yet, so
      // `console.info` is their intentional observability channel. Scoped here so
      // browser-shipped components cannot log unnoticed; stray `console.log`
      // stays banned everywhere.
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  ...storybook.configs["flat/recommended"],
]

export default config
