/**
 * Re-export of the shared per-IP fixed-window rate limiter.
 *
 * The implementation moved to `src/shared/rate-limit.ts` (story 7.1) so the
 * venues plugin can reuse it without importing another plugin's internals. This
 * module is kept as the events-manager-local entry point so its middleware map
 * and existing tests (`__tests__/rate-limit.unit.test.ts`) keep importing
 * `../rate-limit` unchanged.
 */
export { createRateLimit } from "../../../../../shared/rate-limit"
