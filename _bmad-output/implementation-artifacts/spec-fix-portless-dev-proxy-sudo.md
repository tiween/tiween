---
title: "Fix portless dev proxy sudo prompt (pin port 1355)"
type: "bugfix"
created: "2026-08-06"
status: "done"
route: "one-shot"
---

# Fix portless dev proxy sudo prompt (pin port 1355)

## Intent

**Problem:** `yarn dev` failed because the portless proxy was no longer running and its auto-start defaulted to port 443, which requires an interactive sudo password — while every dev URL in the repo (env files, `gen:strapi-types`) hardcodes `https://*.tiween.localhost:1355`.

**Approach:** Pin the proxy to unprivileged port 1355 via a repo `.envrc` (`PORTLESS_PORT=1355`, direnv), un-ignore `.envrc` so it can be committed despite the user's global gitignore, start the proxy on 1355 immediately, and align the README/example-file docs that still instructed the sudo-prompting `portless proxy start --https`.

## Suggested Review Order

1. [.envrc](../../.envrc) — the fix itself: one env var pinning the proxy port.
2. [.gitignore](../../.gitignore) — `!.envrc` negation so the file survives the global gitignore and ships with the repo.
3. [README.md](../../README.md) — corrected proxy start command (`--port 1355 --https`) plus the why and the stop-first note.
4. [apps/client/.env.local.example](../../apps/client/.env.local.example) — comment now points at the correct start command and the `.envrc` pin.
5. [apps/strapi/.env.example](../../apps/strapi/.env.example) — matching one-line pointer to the README's Portless section.
