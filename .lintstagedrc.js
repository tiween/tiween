module.exports = {
  // Run prettier only on the staged files lint-staged passes in (it appends the
  // matched paths). Do NOT call `yarn format` here — that script has a repo-wide
  // `**/*` glob baked in and would reformat the whole tree on every commit.
  "*.{js,jsx,ts,tsx,md,css,scss}": [
    "prettier --write --cache --ignore-unknown",
  ],

  // Repo-hygiene guard (story 1.13) — the same script CI's Lint job runs, on the
  // same rules. The coverage is NOT identical, though: `.husky/pre-commit` skips
  // lint-staged entirely while a merge/rebase/cherry-pick/revert is in progress,
  // so a conflict-resolution commit passes this gate unchecked and CI is what
  // catches it.
  //
  // A slash-free pattern is matched by lint-staged against the file's BASENAME,
  // not its path, so `"*"` reaches every staged file at any depth — verified
  // for this story by staging
  // `scripts/probe/nested/probe-hygiene.txt` and watching this entry pick it up.
  // lint-staged appends the matched (absolute) paths to the command, which puts
  // the script into its explicit-path mode.
  //
  // ORDERING DEPENDENCY: this entry overlaps the prettier entry above, and
  // prettier rewrites files in place. `.husky/pre-commit` invokes lint-staged
  // with `--concurrent false`, which is what keeps the guard from reading a
  // half-written buffer. Do not drop that flag, and do not invoke lint-staged
  // without it.
  "*": ["node scripts/check-repo-hygiene.mjs"],
}
