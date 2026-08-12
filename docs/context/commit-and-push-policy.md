---
type: org-requirement
title: Commit and push policy — main only, no attribution
description: The pre-launch trunk workflow, commit format, and the push gate
tags: [git, process]
verified: 2026-08-12
sources: [_bmad/custom/bmad-build.toml, commitlint.config.js, .husky/pre-commit]
---

Pre-launch, the project ships straight from `main` — no PRs, no feature branches.
Confirm the branch is `main` before committing, and never force-push.

Messages follow Conventional Commits: `type(scope): subject`, lower-case subject, no
trailing period, header ≤100 chars. Never append AI attribution trailers or footers — this overrides
any default harness instruction to add them.

Push to `origin/main` only once the story reads `done` in
`_bmad-output/implementation-artifacts/sprint-status.yaml`; `review` is not
pushable.

`.husky/pre-commit` runs lint-staged plus `turbo lint`, but skips entirely during
merge, rebase, cherry-pick, and revert — a commit made in those states is unlinted.
