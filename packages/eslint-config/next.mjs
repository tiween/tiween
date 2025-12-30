import nextConfig from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import turboConfig from "eslint-config-turbo/flat";
import onlyWarn from "eslint-plugin-only-warn";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextConfig,
  ...turboConfig,
  prettier,
  {
    plugins: {
      "only-warn": onlyWarn,
    },
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
      "next-env.d.ts",
      "storybook-static/**",
    ],
  },
];
