/**
 * D-20 publish-rule bypass for the launch importer.
 *
 * The D-19 poster rule stays strict for humans. The importer (a script, in
 * process) may publish a short film without a poster inside an explicit scope;
 * the creative-works publish guard reads the scope, skips only POSTER_REQUIRED
 * and logs every use.
 *
 * Node only (`node:async_hooks`): never import this from admin or client code.
 *
 * WHY THE STORE IS PROCESS-GLOBAL: the importer runs under tsx and imports this
 * file from `src/`, while the plugin always loads from compiled `dist/`. That
 * is two module instances, and a module-local store would silently never match
 * between the caller and the guard. The same applies to boot tests (ts-jest
 * source versus the dist plugin). Keying the AsyncLocalStorage on a
 * `Symbol.for` slot of `globalThis` makes every copy share one store.
 *
 * Nothing here is reachable from a request: the scope exists only for the
 * duration of an in-process callback.
 */
import { AsyncLocalStorage } from "node:async_hooks"

export interface ShortFilmPublishBypassScope {
  /** Why the bypass is used; logged with every bypassed publish. */
  reason: string
  /** The only rule a scope may skip. */
  skip: readonly ["POSTER_REQUIRED"]
}

const STORE_KEY = Symbol.for("tiween.creative-works.short-film-publish-bypass")

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: AsyncLocalStorage<ShortFilmPublishBypassScope>
}

function store(): AsyncLocalStorage<ShortFilmPublishBypassScope> {
  const holder = globalThis as GlobalWithStore
  if (!holder[STORE_KEY]) {
    holder[STORE_KEY] = new AsyncLocalStorage<ShortFilmPublishBypassScope>()
  }
  return holder[STORE_KEY]
}

function isValidScope(scope: ShortFilmPublishBypassScope): boolean {
  return (
    typeof scope?.reason === "string" &&
    scope.reason.trim() !== "" &&
    Array.isArray(scope.skip) &&
    scope.skip.length === 1 &&
    scope.skip[0] === "POSTER_REQUIRED"
  )
}

/**
 * Run `fn` with the poster rule bypassed for every short-film publish it
 * triggers in this process. Rejects with `INVALID_BYPASS_SCOPE` (without
 * running `fn`) for an empty reason or any skip list other than exactly
 * `["POSTER_REQUIRED"]`.
 */
export async function runWithShortFilmPublishBypass<T>(
  scope: ShortFilmPublishBypassScope,
  fn: () => Promise<T>
): Promise<T> {
  if (!isValidScope(scope)) {
    throw new Error("INVALID_BYPASS_SCOPE")
  }
  const frozen: ShortFilmPublishBypassScope = Object.freeze({
    reason: scope.reason.trim(),
    skip: Object.freeze(["POSTER_REQUIRED"] as const),
  })
  return store().run(frozen, fn)
}

/** The active scope, or undefined outside `runWithShortFilmPublishBypass`. */
export function getShortFilmPublishBypass():
  | ShortFilmPublishBypassScope
  | undefined {
  return store().getStore()
}
