import nextConfig from "@tiween/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextConfig,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@next/next/no-html-link-for-pages": "off",
      "no-unused-vars": "warn",
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
      "no-unused-vars": "off",
    },
  },
];
