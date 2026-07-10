/**
 * Global Vitest setup: registers the `@testing-library/jest-dom` matchers
 * (`toBeInTheDocument`, `toBeDisabled`, `toHaveAttribute`, …) on `expect`.
 *
 * Wired via `setupFiles` in `vitest.config.ts`. Purely additive — it extends
 * `expect` with DOM matchers and has no other side effects, so native matchers
 * (`toBeTruthy`, `toEqual`, …) used elsewhere are unaffected.
 */
import "@testing-library/jest-dom/vitest"
