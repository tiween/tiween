/**
 * Unit suite for the repo-hygiene guard.
 *
 * Every row of the story's I/O & edge-case matrix has at least one case here.
 * Fixtures are written under `os.tmpdir()`, never inside the repo, so the
 * whole-repo self-check (`git ls-files`) can never see them and the suite
 * cannot make the guard it tests go red.
 *
 * Every control byte in this file is written as an ESCAPE SEQUENCE (`\x00`),
 * never as a raw byte — otherwise the suite would itself violate the invariant
 * it tests, which is exactly the story 5.6 defect.
 *
 * Run: `node --test scripts/check-repo-hygiene.test.mjs` (aka `yarn hygiene:test`).
 */

import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, describe, it } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

import {
  BINARY_EXTENSIONS,
  checkBuffer,
  checkPaths,
  formatReport,
  isBinaryPath,
  trackedPaths,
} from "./check-repo-hygiene.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const CLI = join(HERE, "check-repo-hygiene.mjs")
const REPO_ROOT = join(HERE, "..")

const SANDBOX = mkdtempSync(join(tmpdir(), "repo-hygiene-"))
after(() => rmSync(SANDBOX, { recursive: true, force: true }))

let seq = 0
/** Write a fixture outside the repo and return its absolute path. */
function fixture(name, contents) {
  const path = join(SANDBOX, `${seq++}-${name}`)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
  return path
}

/** Run the CLI, returning {status, stdout, stderr}. */
function runCli(args, cwd = SANDBOX) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    return { status: 0, stdout, stderr: "" }
  } catch (error) {
    return {
      status: error.status,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    }
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

describe("checkBuffer — clean inputs", () => {
  it("passes plain ASCII source", () => {
    assert.equal(checkBuffer(Buffer.from("const a = 1\n", "utf8")), null)
  })

  it("passes non-Latin UTF-8 (Arabic, French accents, emoji)", () => {
    const text = "مرحبا — séances à Tunis 🎬\n"
    assert.equal(checkBuffer(Buffer.from(text, "utf8")), null)
  })

  it("passes the allowed whitespace controls (tab, LF, CRLF)", () => {
    assert.equal(checkBuffer(Buffer.from("a\tb\r\nc\nd\r\n", "utf8")), null)
  })

  it("passes an empty file", () => {
    assert.equal(checkBuffer(Buffer.alloc(0)), null)
  })
})

describe("checkBuffer — control bytes", () => {
  it("fails on a NUL byte (the story 5.6 defect) with line, column and U+0000", () => {
    const buf = Buffer.from("line one\nlin\x00e two\n", "utf8")
    assert.deepEqual(checkBuffer(buf), {
      kind: "control-byte",
      line: 2,
      column: 4,
      detail: "U+0000",
    })
  })

  for (const [name, char, label] of [
    ["backspace", "\x08", "U+0008"],
    ["unit separator", "\x1f", "U+001F"],
    ["DEL", "\x7f", "U+007F"],
    ["vertical tab", "\x0b", "U+000B"],
    ["form feed", "\x0c", "U+000C"],
    ["escape", "\x1b", "U+001B"],
    ["shift out", "\x0e", "U+000E"],
  ]) {
    it(`fails on ${name}`, () => {
      const violation = checkBuffer(Buffer.from(`ok${char}\n`, "utf8"))
      assert.equal(violation.kind, "control-byte")
      assert.equal(violation.detail, label)
      assert.equal(violation.line, 1)
      assert.equal(violation.column, 3)
    })
  }

  it("reports the FIRST violation when several are present", () => {
    const violation = checkBuffer(Buffer.from("a\x1fb\x00c", "utf8"))
    assert.equal(violation.detail, "U+001F")
    assert.equal(violation.column, 2)
  })

  it("reports the column in BYTES, matching the invalid-utf8 path", () => {
    // Two 4-byte emoji + "x" = 9 bytes before the NUL, so byte column 10.
    // A UTF-16-code-unit count would say 6, a code-point count 4 — neither
    // locates the byte in a hex dump.
    const violation = checkBuffer(Buffer.from("🎬🎬x\x00", "utf8"))
    assert.equal(violation.column, 10)
    assert.equal(violation.detail, "U+0000")
  })

  it("does not let a leading BOM shift line-1 columns", () => {
    const withBom = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from("ab\x00", "utf8"),
    ])
    // The BOM occupies bytes 1-3, so the NUL sits at byte column 6. Decoding
    // with the default `ignoreBOM: false` would swallow it and report 3.
    assert.equal(checkBuffer(withBom).column, 6)
    assert.equal(checkBuffer(Buffer.from("ab\x00", "utf8")).column, 3)
  })
})

describe("checkBuffer — invalid UTF-8", () => {
  it("fails on a lone 0xFF at its byte offset", () => {
    const buf = Buffer.concat([
      Buffer.from("ab\ncd", "utf8"),
      Buffer.from([0xff]),
    ])
    assert.deepEqual(checkBuffer(buf), {
      kind: "invalid-utf8",
      line: 2,
      column: 3,
      detail: "0xFF",
    })
  })

  it("fails on a truncated multi-byte sequence at EOF", () => {
    const buf = Buffer.concat([
      Buffer.from("x", "utf8"),
      Buffer.from([0xe2, 0x82]),
    ])
    const violation = checkBuffer(buf)
    assert.equal(violation.kind, "invalid-utf8")
    assert.equal(violation.line, 1)
    assert.equal(violation.column, 2)
    assert.equal(violation.detail, "0xE2")
  })

  it("fails on a lead byte followed by a non-continuation byte", () => {
    const buf = Buffer.from([0x61, 0xc3, 0x28, 0x62])
    const violation = checkBuffer(buf)
    assert.equal(violation.kind, "invalid-utf8")
    assert.equal(violation.column, 2)
    assert.equal(violation.detail, "0xC3")
  })

  it("fails on an overlong encoding of NUL (0xC0 0x80)", () => {
    const violation = checkBuffer(Buffer.from([0xc0, 0x80]))
    assert.equal(violation.kind, "invalid-utf8")
    assert.equal(violation.detail, "0xC0")
  })

  it("fails on an unpaired surrogate encoded as UTF-8 (0xED 0xA0 0x80)", () => {
    const violation = checkBuffer(Buffer.from([0xed, 0xa0, 0x80]))
    assert.equal(violation.kind, "invalid-utf8")
    assert.equal(violation.detail, "0xED")
  })

  it("fails on a UTF-16LE-encoded source (BOM + NUL-interleaved bytes)", () => {
    const buf = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from("const a = 1\n", "utf16le"),
    ])
    const violation = checkBuffer(buf)
    assert.ok(
      violation !== null &&
        (violation.kind === "invalid-utf8" ||
          violation.kind === "control-byte"),
      `expected invalid-utf8 or control-byte, got ${JSON.stringify(violation)}`
    )
  })

  it("passes a UTF-16LE source once round-tripped back to UTF-8", () => {
    const original = "const a = 1\n"
    const utf16 = Buffer.from(original, "utf16le")
    const back = Buffer.from(utf16.toString("utf16le"), "utf8")
    assert.equal(back.toString("utf8"), original)
    assert.equal(checkBuffer(back), null)
  })
})

describe("isBinaryPath — the fail-closed allowlist", () => {
  it("skips allowlisted assets, case-insensitively on the extension", () => {
    assert.equal(isBinaryPath("foo/bar.png"), true)
    assert.equal(isBinaryPath("FOO/BAR.PNG"), true)
    assert.equal(isBinaryPath("a/b/c.PdF"), true)
    assert.equal(isBinaryPath("assets/fonts/inter.woff2"), true)
  })

  it("checks unknown extensions as text (fail-closed)", () => {
    assert.equal(isBinaryPath("foo/bar.heic"), false)
    assert.equal(isBinaryPath("foo/bar.bin"), false)
    assert.equal(isBinaryPath("src/index.ts"), false)
  })

  it("checks extensionless and dotfile paths as text", () => {
    assert.equal(isBinaryPath("Makefile"), false)
    assert.equal(isBinaryPath("LICENSE"), false)
    assert.equal(isBinaryPath(".gitignore"), false)
    assert.equal(isBinaryPath("dir.png/notanasset"), false)
  })

  it("keeps every measured-inventory extension allowlisted", () => {
    for (const ext of ["png", "pdf", "pptx", "ico", "gif", "gz"]) {
      assert.ok(BINARY_EXTENSIONS.has(ext), `${ext} must be allowlisted`)
    }
  })
})

describe("checkPaths", () => {
  it("skips an allowlisted binary asset even when its bytes are not UTF-8", () => {
    const png = fixture(
      "logo.png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00])
    )
    assert.deepEqual(checkPaths([png]), [])
  })

  it("fails an unknown binary type as invalid-utf8 (fail-closed)", () => {
    const blob = fixture("payload.heic", Buffer.from([0x00, 0xff, 0xfe, 0x01]))
    const [violation] = checkPaths([blob])
    assert.equal(violation.kind, "invalid-utf8")
    assert.equal(violation.path, blob)
  })

  it("skips a directory (EISDIR) without crashing", () => {
    const dir = join(SANDBOX, "a-directory")
    mkdirSync(dir, { recursive: true })
    assert.deepEqual(checkPaths([dir]), [])
  })

  it("skips a path that no longer exists (ENOENT — a staged deletion)", () => {
    assert.deepEqual(
      checkPaths([join(SANDBOX, "deleted-by-the-commit.ts")]),
      []
    )
  })

  it("reports one violation per offending path and keeps clean paths silent", () => {
    const clean = fixture("clean.ts", "export const a = 1\n")
    const dirty = fixture("dirty.ts", "export const b = 2\x00\n")
    const violations = checkPaths([clean, dirty])
    assert.equal(violations.length, 1)
    assert.equal(violations[0].path, dirty)
    assert.equal(violations[0].detail, "U+0000")
  })
})

describe("CLI", () => {
  it("explicit-path mode exits 1 and reports path:line:col kind U+XXXX", () => {
    const dirty = fixture("nul.ts", "alpha\nbeta\x00 gamma\n")
    const result = runCli([dirty])
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      new RegExp(`${escapeRe(dirty)}:2:5\\s+control-byte\\s+U\\+0000`)
    )
    assert.match(result.stderr, /BINARY_EXTENSIONS/)
  })

  it("explicit-path mode exits 0 on clean paths and ignores git ls-files", () => {
    const clean = fixture("clean-cli.ts", "export const a = 1\n")
    const png = fixture("cli.png", Buffer.from([0xff, 0x00, 0xfe]))
    const result = runCli([clean, png])
    assert.equal(result.status, 0)
    // The summary counts files actually READ, not paths submitted: the .png is
    // reported under "skipped", never folded into the coverage figure.
    assert.match(result.stdout, /1 file\(s\) read, 0 violations/)
    assert.match(result.stdout, /1 allowlisted binary/)
  })

  it("rejects any flag-shaped argument instead of skipping it as a path", () => {
    for (const args of [["--help"], ["--fix", "a.ts"], ["-v"]]) {
      const result = runCli(args)
      assert.equal(
        result.status,
        2,
        `expected usage exit for ${JSON.stringify(args)}`
      )
      assert.match(result.stderr, /unknown option/)
    }
  })

  it("treats `--` as end-of-options so a dash-leading path stays reachable", () => {
    // A relative path is the only way a leading dash survives to argv — an
    // absolute fixture path starts with "/". Written directly for that reason.
    const dashed = `-dashed-${seq++}.ts`
    writeFileSync(join(SANDBOX, dashed), "export const a = 1\x00\n")
    const rejected = runCli([dashed])
    assert.equal(
      rejected.status,
      2,
      "a bare dash-leading path is a usage error"
    )

    const result = runCli(["--", dashed])
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /control-byte\s+U\+0000/)
  })

  it("refuses to report clean when every submitted path is missing", () => {
    // The typo case: a guard wired into a hook with a slightly wrong path read
    // nothing and exited 0. ENOENT stays a silent skip when it is one path
    // among many (a staged deletion), but never when it is all of them.
    const result = runCli([
      join(SANDBOX, "no-such-a.ts"),
      join(SANDBOX, "no-such-b.ts"),
    ])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /all 2 submitted path\(s\) are missing/)
  })

  it("refuses when every submitted path is unreadable for a reason other than ENOENT", () => {
    // The all-missing refusal was keyed on `stats.missing === paths.length`, so
    // a typo that happens to name an existing DIRECTORY reached the identical
    // fail-open through `stats.nonRegular`: "0 file(s) read, 0 violations",
    // exit 0. Same defect, different counter.
    const dir = join(SANDBOX, `only-a-dir-${seq++}`)
    mkdirSync(dir, { recursive: true })
    const result = runCli([dir])
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /none of the 1 submitted path\(s\)/)
    assert.match(result.stderr, /1 non-regular/)
  })

  it("still passes when the only submitted path is an allowlisted binary", () => {
    // The read-nothing refusal must NOT swallow this: staging a single .png is
    // a legitimate commit, and the guard has nothing to say about it.
    const png = fixture("only-binary.png", Buffer.from([0xff, 0x00, 0xfe]))
    const result = runCli([png])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /0 file\(s\) read, 0 violations/)
    assert.match(result.stdout, /1 allowlisted binary/)
  })

  it("refuses a bare `--` instead of silently widening to a whole-repo scan", () => {
    // `pathArgs.length > 0` used to be the only mode discriminator, so a
    // wrapper that built ["--", ...paths] from an empty list got the whole
    // tree — the opposite scoping from the one it asked for.
    const result = runCli(["--"], REPO_ROOT)
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /no paths after/)
  })

  it("rejects a second `--` rather than treating it as a path", () => {
    // Only the first `--` was consumed and later ones were never flag-checked,
    // so a stray token landed in `stats.missing` — inflating the exact counter
    // the all-missing refusal is keyed on.
    const clean = fixture("beside-stray.ts", "export const a = 1\n")
    const result = runCli(["--", clean, "--"])
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /`--` appears more than once/)
  })

  it("de-duplicates explicit paths so coverage is not overstated", () => {
    // `trackedPaths()` de-duplicates through a Set; explicit mode never passes
    // through it, so a caller concatenating path lists read the same file twice
    // and would have printed the same violation twice.
    const clean = fixture("dup.ts", "export const a = 1\n")
    const result = runCli([clean, clean])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /1 file\(s\) read, 0 violations/)
  })

  it("still runs when reached through a symlink", () => {
    // `import.meta.url` is the realpath; `process.argv[1]` is the path as
    // invoked. Comparing them raw made the guard print nothing and exit 0
    // behind any bin shim or packaged hook — the quietest possible failure.
    const link = join(SANDBOX, `hygiene-link-${seq++}.mjs`)
    symlinkSync(CLI, link)
    const dirty = fixture("via-link.ts", "a\x00b\n")
    assert.equal(
      runCli([dirty]).status,
      1,
      "control: direct invocation must fail on this fixture"
    )

    let status = 0
    let stderr = ""
    try {
      execFileSync(process.execPath, [link, dirty], {
        cwd: SANDBOX,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    } catch (error) {
      status = error.status
      stderr = error.stderr ?? ""
    }
    assert.equal(status, 1, "symlinked invocation must run and fail loudly")
    assert.match(stderr, /control-byte\s+U\+0000/)
  })

  it("prints the coverage figure on the violation branch too", () => {
    // Without it, a run reporting one violation after reading four files is
    // indistinguishable from one that read five thousand.
    const dirty = fixture("coverage-on-failure.ts", "a\x00b\n")
    const result = runCli([dirty])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /1 file\(s\) read \(0 skipped:/)
  })

  it("still passes when a missing path accompanies a real one", () => {
    const clean = fixture("beside-deletion.ts", "export const a = 1\n")
    const result = runCli([clean, join(SANDBOX, "deleted.ts")])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /1 file\(s\) read, 0 violations/)
  })

  it("counts the further control bytes in a file instead of revealing one per run", () => {
    // The paydown targets held 6 and 3 bytes in one file. Reporting only the
    // first turns that into a run-fix-rerun loop against invisible bytes.
    const dirty = fixture("many.ts", "a\x00b\x1fc\x7fd\n")
    const result = runCli([dirty])
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /control-byte\s+U\+0000\s+\(\+2 more in this file\)/
    )
  })

  it("prints the remediation hint naming BINARY_EXTENSIONS for an unknown binary type", () => {
    const blob = fixture("mystery.heic", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))
    const result = runCli([blob])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid-utf8/)
    assert.match(
      result.stderr,
      /BINARY_EXTENSIONS in scripts\/check-repo-hygiene\.mjs/
    )
  })

  it("whole-repo mode: the real tree is clean (exit 0)", () => {
    const result = runCli([], REPO_ROOT)
    assert.equal(
      result.status,
      0,
      `repo hygiene must be green over the real tree:\n${result.stderr}`
    )
    const read = Number(/(\d+) file\(s\) read/.exec(result.stdout)?.[1] ?? 0)
    const skipped = Number(/\((\d+) skipped/.exec(result.stdout)?.[1] ?? -1)
    // Not just "0 violations": a broken enumeration also reports zero. A bare
    // `read > 1000` floor sits ~5x below the real figure, so a regression that
    // enumerated a fifth of the tree would still pass. Reconcile against the
    // actual tracked count instead — every tracked path is read or skipped.
    const tracked = new Set(
      execFileSync("git", ["ls-files", "-z", "--full-name"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      })
        .split("\0")
        .filter(Boolean)
    ).size
    assert.ok(tracked > 1000, `expected a large tree, got ${tracked} paths`)
    assert.equal(
      read + skipped,
      tracked,
      `guard accounted for ${read + skipped} of ${tracked} tracked paths`
    )
    // Reconciliation ALONE is not a coverage floor: it holds for any split
    // between read and skipped, including `read = 0, skipped = tracked`. A
    // widened allowlist, or a regression that made every path resolve as
    // missing, satisfies it exactly. Pin the read count as a fraction of the
    // tree — binaries are ~2% of it today, so 80% leaves ample headroom while
    // still catching a collapse.
    const missing = Number(/(\d+) missing/.exec(result.stdout)?.[1] ?? -1)
    assert.equal(missing, 0, "every tracked path must resolve on disk")
    assert.ok(
      read >= tracked * 0.8,
      `guard read only ${read} of ${tracked} tracked paths — coverage collapsed`
    )
  })

  it("whole-repo mode is cwd-independent (a run from scripts/ scans the repo)", () => {
    const fromRoot = runCli([], REPO_ROOT)
    const fromSubdir = runCli([], HERE)
    assert.equal(fromSubdir.status, 0, fromSubdir.stderr)
    const count = (out) => Number(/(\d+) file\(s\) read/.exec(out)?.[1] ?? -1)
    assert.equal(count(fromSubdir.stdout), count(fromRoot.stdout))
  })
})

describe("whole-repo mode refuses rather than reporting a clean nothing", () => {
  // These three branches are the guard's own anti-fail-open defences, and every
  // CLI case above runs inside this repo where `git ls-files` always returns
  // 5000+ paths — so none of them was ever entered. Deleting any one of them
  // left the suite green, which is the DW-191 shape the wiring suite exists to
  // prevent, one level down.
  const scratchRepo = (name, build = () => {}) => {
    const dir = join(SANDBOX, `repo-${seq++}-${name}`)
    mkdirSync(dir, { recursive: true })
    execFileSync("git", ["init", "-q", "."], { cwd: dir, stdio: "ignore" })
    build(dir)
    return dir
  }

  it("exits 2 outside any git work tree", () => {
    const bare = join(SANDBOX, `not-a-repo-${seq++}`)
    mkdirSync(bare, { recursive: true })
    const result = runCli([], bare)
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /could not enumerate tracked files/)
  })

  it("exits 2 when the enumeration is empty", () => {
    const result = runCli([], scratchRepo("empty"))
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /returned no paths/)
  })

  it("exits 2 when tracked paths enumerate but none resolve on disk", () => {
    // Sparse checkout, a swept `skip-worktree`, or any cwd regression. The
    // empty-enumeration refusal does not fire here — enumeration succeeded —
    // and the run otherwise printed "0 file(s) read, 0 violations", exit 0:
    // the whole-tree CI gate passing having opened no file at all.
    const dir = scratchRepo("all-missing", (root) => {
      writeFileSync(join(root, "a.ts"), "export const a = 1\n")
      writeFileSync(join(root, "b.ts"), "export const b = 2\n")
      execFileSync("git", ["add", "a.ts", "b.ts"], {
        cwd: root,
        stdio: "ignore",
      })
      execFileSync("git", ["update-index", "--skip-worktree", "a.ts", "b.ts"], {
        cwd: root,
        stdio: "ignore",
      })
      rmSync(join(root, "a.ts"))
      rmSync(join(root, "b.ts"))
    })
    const result = runCli([], dir)
    assert.equal(result.status, 2, result.stdout)
    assert.match(result.stderr, /read 0 of 2 tracked file\(s\)/)
  })

  it("restores the process cwd on the refusal paths, not only around checkPaths", () => {
    // `process.chdir(root)` happens before the enumeration guards; the `finally`
    // only wrapped `checkPaths`, so both early returns left an exported `main()`
    // caller in a different directory.
    // Must run from a SUBDIRECTORY: `process.cwd()` already reports realpaths,
    // so a probe launched at the repo root cannot observe the chdir at all and
    // would pass against the unfixed code.
    const root = scratchRepo("cwd-restore")
    const dir = join(root, "sub")
    mkdirSync(dir, { recursive: true })
    const probe = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { main } from ${JSON.stringify(pathToFileURL(CLI).href)}
         const before = process.cwd()
         main([])
         console.log(process.cwd() === before ? "restored" : "leaked")
         // main() sets process.exitCode on refusal; this probe is about the cwd.
         process.exitCode = 0`,
      ],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    )
    assert.match(probe, /restored/)
  })
})

describe("wiring — the guard is reachable from the gates that must run it", () => {
  it("package.json declares both hygiene scripts", () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8")
    )
    assert.match(pkg.scripts.hygiene, /check-repo-hygiene\.mjs/)
    assert.match(pkg.scripts["hygiene:test"], /check-repo-hygiene\.test\.mjs/)
  })

  it("CI's Lint job runs both hygiene scripts, before yarn install", () => {
    const ci = readFileSync(join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8")
    const lines = ci.split("\n")
    // `\b` matches between "hygiene" and ":", so a bare /yarn hygiene\b/ is
    // satisfied by the `hygiene:test` line alone — deleting the whole-tree step
    // would have left this suite green. Anchor each run: value to end-of-line.
    const indexOfRun = (value) =>
      lines.findIndex((line) => line.trim() === `run: ${value}`)
    const hygiene = indexOfRun("yarn hygiene")
    const hygieneTest = indexOfRun("yarn hygiene:test")
    assert.ok(hygiene >= 0, "no step whose run: is exactly `yarn hygiene`")
    assert.ok(
      hygieneTest >= 0,
      "no step whose run: is exactly `yarn hygiene:test`"
    )

    // Both must sit inside the `lint:` job — a whole-file grep would still pass
    // if they were moved to another job.
    // Anchor to the `jobs:` block: a bare two-space key regex also matches
    // `push:` / `pull_request:` / `workflow_dispatch:` under `on:`, so the
    // assertion below was only accidentally right.
    const jobsBlock = lines.findIndex((line) => /^jobs:\s*$/.test(line))
    assert.ok(jobsBlock >= 0, "no top-level `jobs:` block in ci.yml")
    const jobStarts = lines
      .map((line, i) => [/^ {2}([a-z0-9-]+):\s*$/.exec(line)?.[1], i])
      .filter(([name, i]) => name && i > jobsBlock)
    const jobOf = (index) =>
      jobStarts.filter(([, start]) => start < index).pop()?.[0]
    assert.equal(jobOf(hygiene), "lint")
    assert.equal(jobOf(hygieneTest), "lint")

    // …and before the install step: the placement the spec's Design Notes argue
    // for, so a bad file fails in seconds rather than behind an install failure.
    const install = lines.findIndex((line) =>
      line.includes("name: Install dependencies (immutable)")
    )
    assert.ok(install > 0, "install step not found")
    assert.ok(
      hygiene < install && hygieneTest < install,
      "hygiene steps must run before `Install dependencies (immutable)`"
    )
  })

  it("the pre-commit hook runs lint-staged with --concurrent false", () => {
    // `.lintstagedrc.js` deliberately overlaps the prettier entry, and prettier
    // rewrites in place. Serial execution is the only thing keeping the guard
    // from reading a half-written buffer, and it is declared in a comment —
    // this is what actually holds it.
    const hook = readFileSync(join(REPO_ROOT, ".husky/pre-commit"), "utf8")
    assert.match(hook, /lint-staged[^\n]*--concurrent false/)
  })

  it("lint-staged runs the guard under a pattern that reaches nested paths", () => {
    // lint-staged matches a SLASH-FREE pattern against the basename (micromatch
    // `matchBase`), which is the only reason `"*"` reaches `a/b/c.ts`. A future
    // edit to a slash-bearing pattern would silently narrow the pre-commit half
    // of the gate — this pins the property, not the literal string.
    const config = createRequire(import.meta.url)(
      join(REPO_ROOT, ".lintstagedrc.js")
    )
    const entries = Object.entries(config).filter(([, tasks]) =>
      JSON.stringify(tasks).includes("check-repo-hygiene.mjs")
    )
    assert.equal(entries.length, 1, "exactly one hygiene entry expected")
    const [pattern] = entries[0]
    assert.ok(
      !pattern.includes("/"),
      `pattern ${JSON.stringify(pattern)} contains a slash, so lint-staged ` +
        "would match it against the full path and miss nested files"
    )

    // `--concurrent false` makes lint-staged serial, but serial execution alone
    // does not ORDER the two overlapping entries — lint-staged follows config
    // key order. Swapping the keys (a plausible tidy-up) would make the guard
    // read pre-prettier content, which is the exact hazard the flag exists to
    // prevent. Pin the ordering, not just the serialism.
    const keys = Object.keys(config)
    const prettierKeys = keys.filter((key) =>
      JSON.stringify(config[key]).includes("prettier")
    )
    assert.ok(prettierKeys.length > 0, "no prettier entry found")
    for (const prettierKey of prettierKeys) {
      assert.ok(
        keys.indexOf(pattern) > keys.indexOf(prettierKey),
        `the hygiene entry ${JSON.stringify(pattern)} must be declared after ` +
          `${JSON.stringify(prettierKey)} so it reads prettier's output, not its input`
      )
    }
  })
})

describe("fail-closed skips and read failures", () => {
  it("skips a symlink rather than judging its target's content", () => {
    const target = fixture("symlink-target.png", Buffer.from([0xff, 0x00]))
    const link = join(SANDBOX, `${seq++}-link.ts`)
    symlinkSync(target, link)
    const stats = {}
    assert.deepEqual(checkPaths([link], stats), [])
    assert.equal(stats.nonRegular, 1)
    assert.equal(stats.checked, 0)
  })

  it("reports an unreadable file as a violation instead of throwing", (t) => {
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      t.skip("running as root — permissions are not enforced")
      return
    }
    const path = fixture("locked.ts", "export const a = 1\n")
    chmodSync(path, 0o000)
    try {
      const [violation] = checkPaths([path])
      assert.equal(violation.kind, "unreadable")
      assert.equal(violation.detail, "EACCES")
    } finally {
      chmodSync(path, 0o600)
    }
  })

  it("counts skips separately from files read", () => {
    const stats = {}
    const clean = fixture("counted.ts", "ok\n")
    const png = fixture("counted.png", Buffer.from([0xff]))
    checkPaths([clean, png, join(SANDBOX, "gone.ts")], stats)
    assert.deepEqual(stats, {
      checked: 1,
      binary: 1,
      nonRegular: 0,
      missing: 1,
      failed: 0,
    })
  })

  it("every submitted path lands in exactly one counter", () => {
    const stats = {}
    const paths = [
      fixture("acct-clean.ts", "ok\n"),
      fixture("acct.png", Buffer.from([0xff])),
      join(SANDBOX, "acct-gone.ts"),
      "src/acct-caf�.ts",
    ]
    checkPaths(paths, stats)
    const total =
      stats.checked +
      stats.binary +
      stats.nonRegular +
      stats.missing +
      stats.failed
    assert.equal(total, paths.length)
  })

  it("reports a filename that did not survive UTF-8 decoding", () => {
    const [violation] = checkPaths(["src/caf�.ts"])
    assert.equal(violation.kind, "undecodable-path")
  })

  it("does NOT flag a file genuinely named with U+FFFD (it is valid UTF-8)", () => {
    // The undecodable-path check keys on the lossy-decode artifact, which by
    // construction names nothing on disk. A real file whose name contains the
    // replacement character is well-encoded and must be read as text.
    const path = fixture("real-�-name.ts", "export const a = 1\n")
    const stats = {}
    assert.deepEqual(checkPaths([path], stats), [])
    assert.equal(stats.checked, 1)
    assert.equal(stats.failed, 0)
  })
})

describe("formatReport", () => {
  it("renders a positionless kind without a bogus :0:0 location", () => {
    const out = formatReport([
      {
        path: "src/a.ts",
        kind: "unreadable",
        line: 0,
        column: 0,
        detail: "EACCES",
      },
    ])
    assert.match(out, /^src\/a\.ts {2}unreadable {2}EACCES$/m)
    assert.doesNotMatch(out, /src\/a\.ts:0:0/)
  })

  it("appends the further-occurrence count only when there is one", () => {
    const one = formatReport([
      {
        path: "a.ts",
        kind: "control-byte",
        line: 1,
        column: 2,
        detail: "U+0000",
      },
    ])
    assert.doesNotMatch(one, /more in this file/)
    const many = formatReport([
      {
        path: "a.ts",
        kind: "control-byte",
        line: 1,
        column: 2,
        detail: "U+0000",
        more: 5,
      },
    ])
    assert.match(
      many,
      /a\.ts:1:2 {2}control-byte {2}U\+0000 {2}\(\+5 more in this file\)/
    )
  })
})

describe("trackedPaths", () => {
  it("enumerates the whole repo regardless of cwd, with no duplicates", () => {
    const cwd = process.cwd()
    process.chdir(HERE)
    try {
      const paths = trackedPaths()
      assert.ok(paths.length > 1000, `got only ${paths.length} tracked paths`)
      assert.ok(paths.includes("package.json"), "expected repo-relative names")
      assert.equal(new Set(paths).size, paths.length, "duplicate entries")
    } finally {
      process.chdir(cwd)
    }
  })
})
