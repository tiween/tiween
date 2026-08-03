import westernNumerals from "./rules/western-numerals.mjs"

/**
 * The repo's local ESLint plugin, namespaced `@tiween` to match the workspace
 * scope — so the rule id is `@tiween/western-numerals`.
 *
 * Flat config requires a plugin *object* (not a module path), so this is
 * imported and spread into `plugins` by each consuming config.
 *
 * @type {import("eslint").ESLint.Plugin}
 */
const plugin = {
  meta: { name: "@tiween" },
  rules: {
    "western-numerals": westernNumerals,
  },
}

export default plugin
