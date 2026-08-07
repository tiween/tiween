/**
 * Shared RSC-serializability guard for the Server-Component route tests.
 *
 * Every prop a Server Component hands a `"use client"` island must survive the
 * RSC boundary. A function anywhere in that tree makes React throw "Functions
 * cannot be passed directly to Client Components" at render time — the crash
 * this guard exists to catch before a browser does.
 *
 * Deliberately generic (never keyed to specific label names) so it guards the
 * whole bug class: a callback accidentally passed as `onSomething`, a lazily
 * built formatter on `regions`/`venues`, or a future parameterized label are
 * all caught the same way.
 */

/**
 * Props whose values legitimately contain functions and are NOT serialized as
 * data. `children` is already-rendered React elements: each element's `type` is
 * the component function itself, so walking into them would report a false
 * positive on every route that nests markup.
 */
const DEFAULT_SKIP_KEYS = ["children"] as const

export interface AssertNoFunctionPropsOptions {
  /** Label used as the root of the reported path. */
  rootPath?: string
  /** Keys skipped at any depth. Defaults to `["children"]`. */
  skipKeys?: readonly string[]
}

/**
 * Throw if any value reachable from `props` is a function.
 *
 * The thrown message names the full path (`props.labels.bottomNav.notifications`)
 * so a failure points at the offending field rather than just "somewhere".
 * Cycles are tolerated: a repeated object is skipped rather than recursed into,
 * so a circular graph reports its function (or passes) instead of blowing the
 * stack.
 */
export function assertNoFunctionProps(
  props: unknown,
  {
    rootPath = "props",
    skipKeys = DEFAULT_SKIP_KEYS,
  }: AssertNoFunctionPropsOptions = {}
): void {
  const seen = new WeakSet<object>()

  const walk = (value: unknown, path: string): void => {
    if (typeof value === "function") {
      throw new Error(`non-serializable function prop at ${path}`)
    }
    if (value === null || typeof value !== "object") return

    // Cycle guard — also de-duplicates shared sub-trees, which only ever saves
    // work: a function reachable by two paths is still reported via the first.
    if (seen.has(value)) return
    seen.add(value)

    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`))
      return
    }

    for (const [key, entry] of Object.entries(value)) {
      if (skipKeys.includes(key)) continue
      walk(entry, `${path}.${key}`)
    }
  }

  walk(props, rootPath)
}
