// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from "@tiween/eslint-config/next";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
const config = [...nextConfig, ...tseslint.configs.recommended, {
  rules: {
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
}, {
  files: ["src/components/ui/*.tsx"],
  rules: {
    "react/jsx-curly-brace-presence": "off",
    "@typescript-eslint/no-unused-vars": "off",
  },
}, ...storybook.configs["flat/recommended"]];

export default config;
