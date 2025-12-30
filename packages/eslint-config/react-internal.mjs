import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import turboConfig from "eslint-config-turbo/flat";
import onlyWarn from "eslint-plugin-only-warn";
import globals from "globals";

/*
 * This is a custom ESLint configuration for use with
 * internal (bundled by their consumer) libraries
 * that utilize React.
 */

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...turboConfig,
  prettier,
  {
    plugins: {
      "only-warn": onlyWarn,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        React: true,
        JSX: true,
      },
    },
    rules: {
      // Add any custom rules here
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", ".*.js"],
  },
];
