/**
 * dist/ freshness guard for the boot-based integration suites.
 *
 * The suites boot from a prebuilt `dist/` (see helpers/strapi.ts). The
 * `yarn test:integration` script refreshes it with the transpile-tolerant
 * `yarn build:test-dist` — deliberately `(… || true)`-guarded so type errors
 * (tsc exits non-zero while still emitting) never skip the suite. That guard
 * also swallows a build that failed WITHOUT emitting (tsc crash, broken
 * tsconfig, missing binary), in which case jest would silently verify
 * yesterday's compiled code. This check closes that hole at the boot surface:
 * if anything under the source trees is newer than everything tsc emitted,
 * refuse to boot with an actionable error instead.
 */
import fs from "fs"
import path from "path"

/**
 * Only tsc-compiled sources count on the source side: Strapi itself WRITES
 * generated artifacts under `src/` at boot (the documentation plugin
 * regenerates the versioned `full_documentation.json` under
 * `src/extensions/documentation/`), so
 * comparing every file would mark dist/ stale the moment the first suite in a
 * run boots.
 */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".cjs", ".mjs"])

/**
 * Newest file mtime (ms) under `dir`, recursive; -Infinity if absent/empty.
 * With `codeOnly`, files whose extension is not a compilable source
 * extension are ignored.
 */
export function newestMtimeMs(dir: string, codeOnly = false): number {
  let newest = -Infinity
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return newest
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeMs(full, codeOnly))
    } else if (entry.isFile()) {
      if (codeOnly && !CODE_EXTENSIONS.has(path.extname(entry.name))) continue
      newest = Math.max(newest, fs.statSync(full).mtimeMs)
    }
  }
  return newest
}

/**
 * Throw unless the compiled output under `distDir` is at least as new as the
 * sources it was built from. Compares the `src/` and `config/` trees — the
 * code Strapi actually loads at boot.
 */
export function assertTestDistFresh(appDir: string, distDir: string): void {
  const remedy =
    "run the boot-based suites via `yarn test:integration` (or refresh " +
    "dist/ with `yarn build:test-dist`)"

  const newestSrc = Math.max(
    newestMtimeMs(path.join(appDir, "src"), true),
    newestMtimeMs(path.join(appDir, "config"), true)
  )
  const newestDist = Math.max(
    newestMtimeMs(path.join(distDir, "src")),
    newestMtimeMs(path.join(distDir, "config"))
  )

  if (newestDist === -Infinity) {
    throw new Error(`dist/ has no compiled src/ — ${remedy}`)
  }
  if (newestSrc > newestDist) {
    throw new Error(
      `dist/ is STALE (a source file is newer than every compiled file) — ` +
        `booting it would verify outdated code; ${remedy}`
    )
  }
}
