/**
 * E2E environment contract (see `scripts/e2e/env.sh`).
 *
 * `yarn workspace @tiween/admin e2e:up` boots an isolated Postgres-backed
 * Strapi at E2E_BASE_URL and upserts a Super Admin with these credentials. The
 * defaults mirror env.sh so a bare `yarn test:e2e` works against a default
 * stack.
 */
import path from "node:path"

export const BASE_URL = (
  process.env.E2E_BASE_URL ?? "http://localhost:1338"
).replace(/\/$/, "")

export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@tiween.local"

export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin123!"

/** Saved admin browser session, written once by global-setup. */
export const STORAGE_STATE = path.join(__dirname, "..", ".auth", "admin.json")

export const FIXTURES_DIR = path.join(__dirname, "..", "fixtures")

/** Public short-film directory base path (content API). */
export const SHORT_FILMS_API = "/api/creative-works/creative-works/short-films"

/** Slug prefix of every document the E2E suites create (purged on start). */
export const E2E_SLUG_PREFIX = "e2e-"
