---
type: convention
title: Two test runners, two layouts, one CI gap
description: Per-app runner and directory conventions, and which suites CI never runs
tags: [testing, ci]
verified: 2026-08-12
sources: [apps/strapi/jest.config.cjs, .github/workflows/ci.yml]

---

`apps/client` runs Vitest with co-located `*.test.tsx`. `apps/strapi` runs Jest
with `__tests__/` directories. Both are intentional; the "never create
`__tests__`" rule applies to the client only.

Strapi's Jest config defines two projects, both running under plain `yarn test`:
`server` (`**/*.unit.test.ts`, mocked Strapi, no DB) and `admin` (`**/*.test.tsx`,
jsdom). The boot-based `*.service.test.ts` and `*.controller.test.ts` suites
exercise real Strapi against SQLite and run only under
`yarn workspace @tiween/admin test:integration`, which `.github/workflows/ci.yml`
never invokes. Green CI therefore says nothing about the integration suite — run it
locally before closing backend work.

E2E: Playwright specs live in `apps/strapi/e2e/specs/` and run against an isolated Postgres-backed Strapi on port 1338 (`e2e:up` / `e2e:down`, docs in `apps/strapi/scripts/e2e/README.md`). Run with `yarn workspace @tiween/admin test:e2e`; the stack must be up first.
