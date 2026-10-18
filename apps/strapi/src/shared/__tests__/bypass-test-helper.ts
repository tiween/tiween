/**
 * Test-only door to the D-20 bypass for suites that live outside `src/shared`
 * (the creative-works guard unit and boot suites).
 *
 * The bypass must be callable only from `scripts/seeds` and tests, never from
 * production code under `src/`. Plan 01-06 enforces that with a grep for the
 * entry point's name outside `src/shared`; routing tests through this alias
 * keeps that grep a strict check (any hit is a real caller) instead of one that
 * every test file trips.
 */
export { runWithShortFilmPublishBypass as withPosterBypassForTest } from "../short-film-publish-bypass"
