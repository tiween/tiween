// Directory-scoped lint-staged config. lint-staged applies the *nearest*
// config to each staged file, so this SHADOWS the repo-root `.lintstagedrc.js`
// for everything under `apps/strapi`. The `prettier --write` glob must therefore
// stay a SUPERSET of the root one (`*.{js,jsx,ts,tsx,md,css,scss}`) or
// format-on-commit silently stops covering backend markdown/CSS while CI's
// `yarn format:check` still checks them repo-wide.
module.exports = {
  "*.{js,jsx,cjs,mjs,ts,tsx,md,css,scss}": [
    "prettier --write --cache --ignore-unknown",
  ],
  "*.{js,jsx,cjs,mjs,ts,tsx}": ["eslint --max-warnings=0 --no-warn-ignored"],
}
