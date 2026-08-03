#!/usr/bin/env node
/**
 * Repo-hygiene guard: every tracked file must be strict UTF-8 text, free of
 * C0/DEL control bytes other than tab, LF and CR.
 *
 * Why this exists: nothing else in the repo decodes a file strictly. ESLint,
 * prettier, `tsc` and the test runners all decode lossily or never open the
 * file, so a source file carrying raw control bytes (story 5.6) survived two
 * review passes — a byte that renders as nothing is invisible in a diff.
 *
 * FAIL-CLOSED RULE. A file is skipped only when its extension appears in
 * BINARY_EXTENSIONS below, or when it is not a regular file. An unknown
 * extension is checked as text, so a new binary asset type fails the guard with
 * an actionable message rather than being silently admitted. Widening the guard
 * is therefore always a visible, reviewable edit to this list.
 *
 * Positions are always reported in BYTES (`path:line:byte-column`), for both
 * violation kinds. A buffer that does not decode has no characters to count, so
 * bytes are the only unit both kinds can share — and bytes are also the unit
 * that locates an invisible byte in `hexdump`/`cat -v`.
 *
 * Usage:
 *   node scripts/check-repo-hygiene.mjs              # every git-tracked file
 *   node scripts/check-repo-hygiene.mjs a.ts b.png   # exactly these paths
 *
 * Dependency-free by design: `node:test`, `TextDecoder` and `git ls-files` are
 * the whole toolchain, so the guard runs in CI before `yarn install`.
 */
import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, realpathSync } from "node:fs"
import { pathToFileURL } from "node:url"

/**
 * Extensions whose contents are never text source.
 *
 * The first group is the measured inventory of tracked files that fail strict
 * UTF-8 today. The second is well-known inert asset formats pre-listed so the
 * first logo/font upload does not red CI; none of them can ever be a text
 * source, so pre-listing them does not weaken the guard.
 *
 * Matched case-insensitively against the final path extension.
 */
export const BINARY_EXTENSIONS = new Set([
  // measured inventory (114 tracked files failing strict UTF-8 at baseline)
  "png",
  "pdf",
  "pptx",
  "ico",
  "gif",
  "gz",
  // images
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "svgz",
  "psd",
  // fonts
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  // audio / video
  "mp4",
  "webm",
  "mov",
  "mp3",
  "wav",
  "ogg",
  // archives
  "zip",
  "tgz",
  "bz2",
  "xz",
  "7z",
  "jar",
  // other binaries
  "wasm",
  "xlsx",
  "docx",
])

/** Control characters that are violations: C0 minus tab/LF/CR, plus DEL. */
const CONTROL_BYTE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
/** Same class, global — used only to count the occurrences after the first. */
const CONTROL_BYTE_ALL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/** Exit code for a usage/environment error — distinct from 1 (violations). */
export const EXIT_USAGE = 2

/**
 * True when `relPath`'s extension is allowlisted as binary.
 *
 * A path with no dot in its final segment (`Makefile`, `LICENSE`) has no
 * extension and is therefore checked as text — fail-closed.
 */
export function isBinaryPath(relPath) {
  const base = String(relPath).split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  if (dot <= 0) return false
  return BINARY_EXTENSIONS.has(base.slice(dot + 1).toLowerCase())
}

/** True when the path names something on disk (symlinks included). */
function pathExists(path) {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

/** `U+XXXX` form of a code point, at least four hex digits. */
function codePointLabel(cp) {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`
}

/**
 * 1-based line and 1-based BYTE column of a byte offset, counting LF bytes.
 */
function bytePosition(buf, offset) {
  let line = 1
  let lastNewline = -1
  for (let i = 0; i < offset; i++) {
    if (buf[i] === 0x0a) {
      line++
      lastNewline = i
    }
  }
  return { line, column: offset - lastNewline }
}

/**
 * Byte offset of the first sequence that is not well-formed UTF-8, or -1.
 * Only ever called after `TextDecoder({fatal:true})` has already thrown, to
 * turn "somewhere in this buffer" into a reportable position.
 */
function firstInvalidUtf8Offset(buf) {
  let i = 0
  while (i < buf.length) {
    const b = buf[i]
    if (b <= 0x7f) {
      i++
      continue
    }
    let need
    let min
    let cp
    if (b >= 0xc2 && b <= 0xdf) {
      need = 1
      min = 0x80
      cp = b & 0x1f
    } else if (b >= 0xe0 && b <= 0xef) {
      need = 2
      min = 0x800
      cp = b & 0x0f
    } else if (b >= 0xf0 && b <= 0xf4) {
      need = 3
      min = 0x10000
      cp = b & 0x07
    } else {
      return i // 0x80-0xC1 continuation/overlong lead, or 0xF5-0xFF
    }
    for (let k = 1; k <= need; k++) {
      const c = buf[i + k]
      if (c === undefined || (c & 0xc0) !== 0x80) return i
      cp = (cp << 6) | (c & 0x3f)
    }
    if (cp < min) return i // overlong
    if (cp > 0x10ffff) return i
    if (cp >= 0xd800 && cp <= 0xdfff) return i // surrogate half
    i += need + 1
  }
  return -1
}

/**
 * Check one file's bytes.
 *
 * `ignoreBOM: true` keeps a leading U+FEFF in the decoded string instead of
 * letting the decoder swallow it — otherwise every column on line 1 of a BOM'd
 * file would be reported one character short.
 *
 * @returns {null | {kind: "invalid-utf8"|"control-byte", line: number, column: number, detail: string, more?: number}}
 *   the first violation found (position in bytes), or null when clean. For
 *   `control-byte`, `more` carries the number of further offending bytes in the
 *   same file, so a file holding several (the paydown targets held 6 and 3) is
 *   not a run-fix-rerun loop against bytes nobody can see.
 */
export function checkBuffer(buf) {
  let text
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      buf
    )
  } catch {
    const offset = firstInvalidUtf8Offset(buf)
    if (offset < 0) {
      // TextDecoder rejected a buffer the walker accepts. Fail closed, but do
      // not point at a byte that is in fact valid.
      return {
        kind: "invalid-utf8",
        line: 0,
        column: 0,
        detail: "unknown offset",
      }
    }
    const { line, column } = bytePosition(buf, offset)
    return {
      kind: "invalid-utf8",
      line,
      column,
      detail: `0x${buf[offset].toString(16).toUpperCase().padStart(2, "0")}`,
    }
  }

  const index = text.search(CONTROL_BYTE)
  if (index === -1) return null

  const before = text.slice(0, index)
  const lastNewline = before.lastIndexOf("\n")
  const total = (text.match(CONTROL_BYTE_ALL) ?? []).length
  return {
    kind: "control-byte",
    line: before.split("\n").length,
    column: Buffer.byteLength(text.slice(lastNewline + 1, index), "utf8") + 1,
    detail: codePointLabel(text.codePointAt(index)),
    ...(total > 1 ? { more: total - 1 } : {}),
  }
}

/**
 * Check every path, skipping allowlisted binaries and non-regular files.
 *
 * Skips, each counted in `stats` so the summary line can never overstate what
 * was actually opened:
 *   - allowlisted binary extensions;
 *   - non-regular entries: directories/gitlinks, and symlinks. Reading through a
 *     link would judge content that is not in the repo, and a link to a FIFO
 *     would block forever. Note this does NOT inspect the link's own blob (git
 *     stores the target path's raw bytes, which are not guaranteed to be UTF-8);
 *     that gap is recorded as deferred work, not claimed as covered here;
 *   - paths that no longer exist (a staged deletion handed over by lint-staged).
 *
 * Any other read failure (EACCES, file-too-large, …) becomes an `unreadable`
 * violation rather than a throw: a silent pass on an unreadable file is
 * forbidden, and throwing would discard the violations already collected.
 *
 * `stats.failed` counts paths that produced a violation *without* being read
 * (`unreadable`, `undecodable-path`), so that
 * `checked + binary + nonRegular + missing + failed === paths.length` always
 * holds and the accounting can never quietly stop adding up.
 *
 * @param {string[]} paths
 * @param {{checked?: number, binary?: number, nonRegular?: number, missing?: number, failed?: number}} [stats]
 * @returns {{path: string, kind: string, line: number, column: number, detail: string, more?: number}[]}
 */
export function checkPaths(paths, stats = {}) {
  stats.checked ??= 0
  stats.binary ??= 0
  stats.nonRegular ??= 0
  stats.missing ??= 0
  stats.failed ??= 0

  const violations = []
  for (const path of paths) {
    // `git ls-files` output is decoded as UTF-8, so a filename whose bytes are
    // not UTF-8 arrives carrying U+FFFD — and, being mojibake, names nothing on
    // disk. That is precisely the encoding class this guard polices, so it is a
    // violation rather than a silent ENOENT skip.
    //
    // The non-existence check is what makes this safe: U+FFFD is itself a legal
    // UTF-8 character, so a file genuinely *named* with one exists and is read
    // as text like any other. Only the lossy-decode artifact is flagged.
    if (String(path).includes("�") && !pathExists(path)) {
      stats.failed++
      violations.push({
        path: String(path),
        kind: "undecodable-path",
        line: 0,
        column: 0,
        detail: "filename is not valid UTF-8",
      })
      continue
    }

    if (isBinaryPath(path)) {
      stats.binary++
      continue
    }

    let info
    try {
      info = lstatSync(path)
    } catch (error) {
      if (error?.code === "ENOENT") {
        stats.missing++
        continue
      }
      stats.failed++
      violations.push({
        path,
        kind: "unreadable",
        line: 0,
        column: 0,
        detail: error?.code ?? "unknown error",
      })
      continue
    }
    if (!info.isFile()) {
      stats.nonRegular++
      continue
    }

    let buf
    try {
      buf = readFileSync(path)
    } catch (error) {
      if (error?.code === "ENOENT") {
        stats.missing++
        continue
      }
      stats.failed++
      violations.push({
        path,
        kind: "unreadable",
        line: 0,
        column: 0,
        detail: error?.code ?? "unknown error",
      })
      continue
    }

    stats.checked++
    const violation = checkBuffer(buf)
    if (violation) violations.push({ path, ...violation })
  }
  return violations
}

/**
 * Absolute path of the repository root.
 * @throws when git is unavailable or the cwd is not a git work tree.
 */
export function repoRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim()
}

/**
 * Every git-tracked path, repo-root-relative, de-duplicated.
 *
 * `--full-name` makes the output independent of the cwd `git` was invoked from
 * (plain `git ls-files` enumerates only the current subtree, which would let a
 * run from `scripts/` report the whole repo green after reading four files).
 * De-duplication collapses the stage-1/2/3 entries git emits for a conflicted
 * path mid-merge, which would otherwise triple every count and every report
 * line for one byte.
 */
export function trackedPaths() {
  const out = execFileSync("git", ["ls-files", "-z", "--full-name"], {
    cwd: repoRoot(),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
  return [...new Set(out.split("\0").filter(Boolean))]
}

export function formatReport(violations) {
  const lines = violations.map((v) => {
    const head =
      v.line === 0 && v.column === 0
        ? `${v.path}  ${v.kind}  ${v.detail}`
        : `${v.path}:${v.line}:${v.column}  ${v.kind}  ${v.detail}`
    return v.more > 0 ? `${head}  (+${v.more} more in this file)` : head
  })
  lines.push("")
  lines.push(
    `${violations.length} repo-hygiene violation(s). Every tracked file must be strict UTF-8`
  )
  lines.push("with no control bytes other than tab, LF and CR (\\t \\n \\r).")
  lines.push(
    "- control-byte: replace the raw byte with its escape text (\\x00, \\x1f, \\x7f)."
  )
  lines.push(
    "- invalid-utf8: if this file is a binary asset, add its extension to"
  )
  lines.push(
    "  BINARY_EXTENSIONS in scripts/check-repo-hygiene.mjs; otherwise re-save it as UTF-8."
  )
  lines.push(
    "  Allowlisting an extension makes the guard skip EVERY file with it, for good —"
  )
  lines.push(
    "  do it only for formats that can never hold source, and prefer re-saving."
  )
  lines.push(
    "- unreadable / undecodable-path: the guard could not open or name the file;"
  )
  lines.push("  fix the permission or rename it to a UTF-8 name.")
  lines.push("Positions are byte offsets: path:line:byte-column.")
  return lines.join("\n")
}

export function main(argv = process.argv.slice(2)) {
  // A literal `--` ends option parsing, so a path that legitimately begins with
  // a dash stays reachable. Without it such a file could never be checked.
  const endOfOptions = argv.indexOf("--")
  const optionArgs = endOfOptions === -1 ? argv : argv.slice(0, endOfOptions)
  const afterOptions = endOfOptions === -1 ? [] : argv.slice(endOfOptions + 1)
  const pathArgs = endOfOptions === -1 ? argv : [...optionArgs, ...afterOptions]

  // Only the FIRST `--` is consumed; a second one is not flag-checked (the flag
  // scan reads `optionArgs` only) and would otherwise flow through as a path,
  // land in `stats.missing`, and inflate the very counter the all-missing
  // refusal is keyed on.
  if (afterOptions.includes("--")) {
    console.error(
      "check-repo-hygiene: `--` appears more than once\n" +
        "usage: node scripts/check-repo-hygiene.mjs [--] [path...]"
    )
    process.exitCode = EXIT_USAGE
    return EXIT_USAGE
  }

  const flag = optionArgs.find((arg) => arg.startsWith("-"))
  if (flag !== undefined) {
    // Without this, a flag (or any typo'd path) is treated as a path, skipped
    // as ENOENT, and counted as "checked" — the guard would report green
    // having read nothing.
    console.error(
      `check-repo-hygiene: unknown option ${flag}\n` +
        "usage: node scripts/check-repo-hygiene.mjs [--] [path...]\n" +
        "       (no arguments = every git-tracked file)"
    )
    process.exitCode = EXIT_USAGE
    return EXIT_USAGE
  }

  const stats = {}
  const enteredCwd = process.cwd()
  // Every early return below can fire *after* `process.chdir(root)`. `main()` is
  // exported, so leaving the process cwd moved is a side effect no in-process
  // caller expects — the `finally` around `checkPaths` alone does not cover the
  // enumeration failures that return before it.
  const restoreCwd = () => {
    if (process.cwd() !== enteredCwd) process.chdir(enteredCwd)
  }
  let paths
  let scope
  let root = ""
  // `--` selects explicit mode even when nothing follows it. Without this, a
  // wrapper that builds `["--", ...computedPaths]` from an empty list would
  // silently fall through to a whole-tree scan — the opposite scoping from the
  // one it asked for, and never reported as the caller bug it is.
  if (endOfOptions !== -1 || pathArgs.length > 0) {
    scope = "explicit"
    // Explicit paths are not de-duplicated by `trackedPaths()`'s Set, so a
    // caller that concatenates path lists would read (and report) the same file
    // twice and overstate coverage in the summary.
    paths = [...new Set(pathArgs.map(String))]
    if (paths.length === 0) {
      console.error(
        "check-repo-hygiene: no paths after `--` — refusing to fall back to a " +
          "whole-repository scan the caller did not ask for."
      )
      process.exitCode = EXIT_USAGE
      return EXIT_USAGE
    }
  } else {
    scope = "repo"
    try {
      root = repoRoot()
      process.chdir(root)
      paths = trackedPaths()
    } catch (error) {
      restoreCwd()
      console.error(
        "check-repo-hygiene: could not enumerate tracked files — run inside a " +
          `git work tree with git on PATH (${error?.message ?? error})`
      )
      process.exitCode = EXIT_USAGE
      return EXIT_USAGE
    }
    if (paths.length === 0) {
      // A zero-length enumeration is never a legitimate pass: it means the
      // enumeration itself broke, and reporting "0 violations" would be the
      // guard's own silent-failure mode.
      restoreCwd()
      console.error(
        "check-repo-hygiene: `git ls-files` returned no paths — refusing to " +
          "report a repository clean without inspecting anything."
      )
      process.exitCode = EXIT_USAGE
      return EXIT_USAGE
    }
  }

  let violations
  try {
    violations = checkPaths(paths, stats)
  } finally {
    restoreCwd()
  }

  const skipped = stats.binary + stats.nonRegular + stats.missing
  const breakdown =
    `(${skipped} skipped: ${stats.binary} allowlisted binary, ` +
    `${stats.nonRegular} non-regular, ${stats.missing} missing)`
  const coverage = `${stats.checked} file(s) read ${breakdown}`

  if (violations.length > 0) {
    // The coverage figure belongs on this branch too: without it a run that
    // reported one violation after reading four files is indistinguishable from
    // one that read five thousand.
    console.error(`${formatReport(violations)}\n${coverage}`)
    process.exitCode = 1
    return 1
  }

  if (scope === "explicit" && stats.checked === 0 && stats.binary === 0) {
    // Same refusal as the empty whole-repo enumeration, for the mode the hook
    // actually uses: nothing submitted was READ, so "0 violations" would be a
    // clean verdict over nothing. One mistyped path in a hook is exactly how
    // that happens — and a typo that lands on a directory reaches the same
    // fail-open through `nonRegular` rather than `missing`. Allowlisted
    // binaries are deliberately exempt: a commit that stages only a `.png`, or
    // a deletion alongside real files, is a legitimate pass.
    const why =
      stats.missing === paths.length
        ? `all ${paths.length} submitted path(s) are missing`
        : `none of the ${paths.length} submitted path(s) could be read ` +
          `(${stats.missing} missing, ${stats.nonRegular} non-regular)`
    console.error(
      `check-repo-hygiene: ${why} — ` +
        "refusing to report them clean without inspecting anything. " +
        "Check the paths passed to the guard."
    )
    process.exitCode = EXIT_USAGE
    return EXIT_USAGE
  }

  if (scope === "repo" && stats.checked === 0) {
    // The whole-tree half of the same invariant. The empty-enumeration refusal
    // above only fires when `git ls-files` returns nothing; an enumeration that
    // succeeds while no path resolves on disk (sparse checkout, a swept
    // `skip-worktree`, a cwd regression) otherwise reports the repository clean
    // having opened no file at all.
    console.error(
      `check-repo-hygiene: read 0 of ${paths.length} tracked file(s) — ` +
        "refusing to report the repository clean without inspecting anything."
    )
    process.exitCode = EXIT_USAGE
    return EXIT_USAGE
  }

  const where = scope === "repo" ? `repo ${root}` : scope
  console.log(
    `repo hygiene (${where}): ${stats.checked} file(s) read, 0 violations ` +
      breakdown
  )
  return 0
}

// `import.meta.url` is the REALPATH of this module while `process.argv[1]` is
// the path as invoked. Comparing them directly makes the guard a silent no-op
// (printing nothing, exiting 0) whenever it is reached through a symlink — a
// bin shim, a packaged hook — which is the loudest failure a guard can have.
const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
if (invokedDirectly) main()
