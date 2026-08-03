import nextConfig from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import turboConfig from "eslint-config-turbo/flat";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextConfig,
  ...turboConfig,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
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
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      ".*.js",
      "**/*.d.ts",
      "storybook-static/**",
    ],
  },
];
