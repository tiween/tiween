import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import turboConfig from "eslint-config-turbo/flat";
import onlyWarn from "eslint-plugin-only-warn";
import globals from "globals";

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
        ...globals.node,
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
