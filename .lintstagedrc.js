module.exports = {
  // Run prettier only on the staged files lint-staged passes in (it appends the
  // matched paths). Do NOT call `yarn format` here — that script has a repo-wide
  // `**/*` glob baked in and would reformat the whole tree on every commit.
  "*.{js,jsx,ts,tsx,md,css,scss}": ["prettier --write --cache --ignore-unknown"],
}
