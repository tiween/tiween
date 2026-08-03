---
title: "Story 1.13: Repo-hygiene CI guard for non-UTF-8 / control-byte files"
type: "chore"
created: "2026-08-03"
status: "done"
baseline_revision: "4b6ce10a374cbf2947057a8132d24b194dbad452"
final_revision: "3c78692" # this line is recorded in the next commit
review_loop_iteration: 0 # bad_spec repair loopbacks; this story has had none
followup_review_recommended: true # 15 patches (1 high, 6 medium). All three reviewers independently found the whole-repo CI gate reporting the repository clean after reading ZERO files — the third consecutive pass in which the previous pass's headline fail-open fix turned out to cover only one of the two modes. The fixes change exit-code semantics in BOTH the commit-blocking hook mode and the CI mode, and add a new exit-2 refusal to each; every one is mutation-tested and the legitimate passes (binary-only staging, deletion beside a real path) are pinned, but the recurrence pattern — and the fact that this pass's own cwd test initially passed against the unfixed code — argues for one more independent look before the guard is trusted unattended
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** Nothing in this repo checks that a committed file is valid UTF-8 text. In story 5.6 a source file carrying raw control bytes was reviewed twice and neither pass saw it — a reviewer reading a rendered diff cannot see a byte that renders as nothing. The residue is still tracked today: `spec-4-3-password-reset-flow.md` and `spec-5-6-schedule-change-notifications.md` between them hold **9 literal control bytes** (`U+0000`, `U+001F`, `U+007F` × 3 occurrences), sitting inside prose that _describes_ the very defect. Lint, prettier, `tsc` and the test suites all pass on them, because every one of those tools decodes lossily or never sees the file at all.

**Approach:** Add one dependency-free Node script that walks every git-tracked file, skips a documented allowlist of known-binary asset extensions, and fails on (a) any byte sequence that is not strict UTF-8 and (b) any C0/DEL control byte other than tab, LF and CR. Wire it at the same three levels as the 1.10–1.12 lint gates — root `yarn` script, CI, and the pre-commit hook — and pay down the 9 existing violations so the guard is green from its first commit.

## Boundaries & Constraints

**Always:**

- The guard is **fail-closed on unknown file types**: a file is skipped only if its extension is in an explicit `BINARY_EXTENSIONS` set. A new binary asset type therefore fails the guard with an actionable message telling the committer to add the extension — it is never silently admitted.
- Allowed control characters are exactly `\t` (U+0009), `\n` (U+000A) and `\r` (U+000D). Everything else in `U+0000–U+001F` plus `U+007F` is a violation. `\r` stays legal so the 19 pre-existing CRLF files under `legacy/` and `.claude/skills/**/*.csv` are not swept into this story.
- Every violation is reported as `path:line:col` with the offending code point in `U+XXXX` form, and the run exits non-zero. A silent pass on an unreadable file is forbidden.
- The scan covers **all tracked files**, BMad artifacts included — the 5.6 escape happened in review prose, and excluding docs would exclude the actual crime scene.
- The checker's own unit suite runs in CI as an explicit step, not through `turbo test` — `turbo test` `dependsOn: ["build"]` and `@tiween/client#build` is red at baseline (DW-185), and turbo input-scoping already produced one stale-cache guard hole (DW-191). This guard must not inherit either.
- The paydown edits replace each literal control byte with its two-character escape _text_ (`\x00`) inside the surrounding prose. No sentence is reworded, no other byte in those files changes.

**Block If:**

- Making the repository pass requires deleting, truncating or rewording tracked content rather than escaping bytes in place.
- A currently-tracked file fails strict UTF-8 and is genuinely a source file (i.e. it cannot be honestly resolved either by an extension allowlist entry or by a byte-level fix).

**Never:**

- Do not add a runtime dependency; `node --test`, `TextDecoder` and `git ls-files` are the whole toolchain.
- Do not turn this into a line-ending, BOM, trailing-whitespace, file-size or filename-charset policy. Those are separate invariants — record them as deferred work.
- Do not edit `turbo.json`, `packages/eslint-config/**`, `apps/client/**` or `apps/strapi/**`.
- Do not run `yarn format` (repo-wide glob; DW-175). Use `npx prettier --write <paths>` on touched paths only.
- Do not "fix" the two spec files' `status:` frontmatter or any other content while editing their control bytes.

## I/O & Edge-Case Matrix

| Scenario                  | Input / State                                         | Expected Output / Behavior                                    | Error Handling                  |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| Plain ASCII source        | `const a = 1\n`                                       | Pass                                                          | No error expected               |
| Non-Latin UTF-8           | Arabic / French accents / emoji, valid UTF-8          | Pass — multi-byte sequences are text, not violations          | No error expected               |
| Allowed whitespace        | File containing `\t`, `\n`, `\r\n`                    | Pass                                                          | No error expected               |
| NUL byte (the 5.6 defect) | `.ts` file containing `U+0000`                        | **Fail** `control-byte`, reported `path:line:col U+0000`      | Exit code 1                     |
| Other control bytes       | File containing `U+0008`, `U+001F` or `U+007F`        | **Fail** `control-byte`                                       | Exit code 1                     |
| Invalid UTF-8             | Lone `0xFF`, or a truncated multi-byte sequence       | **Fail** `invalid-utf8`, reported at the byte offset          | Exit code 1                     |
| UTF-16LE-encoded source   | A `.ts` saved as UTF-16 (BOM + NUL-interleaved bytes) | **Fail** — caught as `invalid-utf8` or `control-byte`         | Exit code 1                     |
| Allowlisted binary asset  | `foo/bar.png`, `FOO/BAR.PNG` (case-insensitive)       | Skipped, no report                                            | No error expected               |
| Unknown binary type       | `foo/bar.woff2` not in `BINARY_EXTENSIONS`            | **Fail** `invalid-utf8` with an "add the extension" hint      | Exit code 1 — fail-closed       |
| Directory / gitlink entry | A submodule path returned by `git ls-files`           | Skipped                                                       | No error, no crash (EISDIR)     |
| Staged deletion           | Path passed by lint-staged that no longer exists      | Skipped                                                       | No error, no crash (ENOENT)     |
| Explicit-path mode        | `node scripts/check-repo-hygiene.mjs a.ts b.png`      | Scans exactly those paths, same rules; ignores `git ls-files` | Exit 1 iff one of them violates |
| Whole-repo mode (no args) | Current tree, 5561 tracked files                      | Exit 0 — the post-paydown steady state                        | No error expected               |

</intent-contract>

## Code Map

- `scripts/` -- root script directory; today holds only `utils/rm-*.sh`. New home for the guard. **Not** inside any yarn workspace, so it is outside `turbo lint`/`turbo test` and outside root `format:check`'s `**/*.{js,jsx,ts,tsx,md,css,scss}` glob (`.mjs` is not matched — DW-188).
- `package.json` (root) -- `"lint"`, `"type-check"`, `"test"`, `"format:check"` scripts; no `"type": "module"`, hence `.mjs` for ESM. Add the `hygiene` script here.
- `.github/workflows/ci.yml` -- five jobs; the `Lint` job (lines ~29-70) runs checkout → turbo cache → `setup-node@v4` (Node 22) → `yarn install` → `Format check` → `Lint`. The guard needs no `node_modules`, so its steps slot in **after Node setup, before install** for fastest feedback.
- `.lintstagedrc.js` -- single `"*.{js,jsx,ts,tsx,md,css,scss}"` entry running prettier; lint-staged appends matched paths to the command and matches slash-free patterns against the **basename**, so `"*"` reaches every staged file.
- `.husky/pre-commit` -- invokes `npx lint-staged --verbose --concurrent false`, then repo-wide `turbo lint`; guarded so it skips during merge/rebase/cherry-pick/revert. No edit needed — the `.lintstagedrc.js` entry is inherited.
- `_bmad-output/implementation-artifacts/spec-4-3-password-reset-flow.md:146,260` -- **6** literal control bytes, two occurrences of the class `[<U+0000>-<U+001F><U+007F>]` written with raw bytes inside a backticked regex in prose.
- `_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md:299` -- **3** more, same shape; the sentence itself claims "the file is now UTF-8 text and diffable", which is true of the source it describes but false of this file.
- Measured binary inventory (114 tracked files failing strict UTF-8, by extension): `.png` 98, `.pdf` 6, `.pptx` 4, `.ico` 3, `.gif` 2, `.gz` 1. Zero UTF-8 BOMs. 19 CRLF files (out of scope).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- ledger; last entry **DW-195**, so new entries start at DW-196.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:64` -- story status; `:280-285` -- the Epic 5 retro action item this story closes.

## Tasks & Acceptance

**Execution:**

- [x] `scripts/check-repo-hygiene.mjs` -- **create** the guard. Export `isBinaryPath(relPath)`, `checkBuffer(buf)` → `null | {kind, line, column, detail}`, and `checkPaths(paths)` → violations; `main()` uses `process.argv` paths when given, else `git ls-files -z`. Decode with `new TextDecoder("utf-8", {fatal: true})` for `invalid-utf8`, then scan for `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/` for `control-byte`. Skip `EISDIR`/`ENOENT`. Print one `path:line:col  kind  U+XXXX` line per violation plus a remediation footer naming `BINARY_EXTENSIONS`, and `process.exitCode = 1` -- one file expresses the whole invariant, with no dependency to install before it can run.
- [x] `scripts/check-repo-hygiene.mjs` (same file) -- define `BINARY_EXTENSIONS` from the measured inventory (`png pdf pptx ico gif gz`) plus the well-known asset formats that can never be source (`jpg jpeg webp avif svgz woff woff2 ttf otf eot mp4 webm mov mp3 wav ogg zip tgz bz2 xz 7z jar wasm xlsx docx psd`), matched case-insensitively on the final extension, with a header comment stating the fail-closed rule -- pre-listing inert formats avoids a CI failure on the first logo upload without weakening the guard, since none of them is ever a text source.
- [x] `scripts/check-repo-hygiene.test.mjs` -- **create** a `node:test` suite covering **every row** of the I/O matrix against temp-directory fixtures (`os.tmpdir()`, not the repo, so `git ls-files` cannot see them), plus a UTF-16LE round-trip fixture, plus an end-to-end `execFileSync` of the CLI asserting exit code and message shape, plus a **repo self-check** asserting the CLI over the real tree exits 0 -- the guard is production code; the self-check is what keeps the tree clean after paydown.
- [x] `package.json` (root) -- add `"hygiene": "node scripts/check-repo-hygiene.mjs"` and `"hygiene:test": "node --test scripts/check-repo-hygiene.test.mjs"` -- one name shared by CI, the hook and a human.
- [x] `.github/workflows/ci.yml` -- in the `Lint` job, insert `Repo hygiene` (`yarn hygiene`) and `Repo hygiene tests` (`yarn hygiene:test`) steps immediately after `Setup Node.js environment` -- satisfies the story's AC, and placing them before `yarn install` means a binary source file fails in seconds and cannot be masked by an unrelated lint failure.
- [x] `.lintstagedrc.js` -- add `"*": ["node scripts/check-repo-hygiene.mjs"]` with a comment explaining basename matching -- gives the hook and CI the same strictness level, per the 1.10 precedent.
- [x] `_bmad-output/implementation-artifacts/spec-4-3-password-reset-flow.md` -- replace the 6 literal control bytes with the escape text `\x00`, `\x1f`, `\x7f` in place -- the file documents a control-byte reject; it should not _be_ one.
- [x] `_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md` -- same for its 3 bytes -- this is the 5.6 residue the story exists to close.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- open DW entries from **DW-196** for each deliberate exclusion: UTF-8 BOM not checked, lone-CR / CRLF not policed, extension-allowlist spoofing (binary payload named `.ts` still passes if it is valid UTF-8; a text file named `.png` is never checked), and untracked-but-unignored files invisible to whole-repo mode -- each is a named decision, not an oversight.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set `1-13-repo-hygiene-encoding-ci-guard` to `done` and flip the Epic 5 repo-hygiene action item from `specced` to `done`.

**Acceptance Criteria:**

- Given the wired guard, when I write a file containing a raw NUL byte into a tracked source path and run `yarn hygiene`, then it exits non-zero naming that path and `U+0000`; deleting the file makes it exit 0.
- Given the CI workflow, when the `Lint` job runs, then `Repo hygiene` and `Repo hygiene tests` both appear as steps that execute before `yarn install`, and `git diff --stat -- turbo.json apps packages` is **empty**.
- Given a staged file with a control byte, when I attempt a commit, then `lint-staged` fails the commit through the same script and the same message, with no `--no-verify` needed for a clean change.
- Given the paid-down tree, when I run `yarn hygiene`, then it exits 0 across all 5561 tracked files, and `grep -c` for control bytes in the two touched spec files returns 0 while their prose reads identically.
- Given the checker suite, when I run `yarn hygiene:test`, then every I/O-matrix row is covered and passes, and each control-byte / invalid-UTF-8 case fails if the corresponding branch is removed from the checker.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 6, low 7)
- defer: 3: (high 0, medium 0, low 3)
- reject: 6: (high 0, medium 1, low 5)
- addressed_findings:
  - `[medium]` `[patch]` **Whole-repo mode silently scoped itself to the current directory.** `git ls-files` enumerates only the cwd's subtree, so `yarn hygiene` run from `scripts/` printed `4 path(s) checked, 0 violations` and exited 0 — a full-repo green verdict after reading four files. `trackedPaths()` now runs `git ls-files -z --full-name` with `cwd` set to `git rev-parse --show-toplevel`, and `main()` chdirs there first so reported paths stay repo-relative. Pinned by a new test asserting a run from `scripts/` reads the same count as one from the root.
  - `[medium]` `[patch]` **A zero-length enumeration was reported as a clean repository.** Any regression in the enumeration (the reviewer demonstrated it by dropping `-z`) yields one bogus path, an ENOENT skip, and `0 violations` / exit 0, with every existing test still green because they all pass explicit paths. Whole-repo mode now exits `2` with an explicit refusal if `git ls-files` returns nothing, and the whole-repo test asserts the read count is `> 1000` rather than merely matching "0 violations".
  - `[medium]` `[patch]` **Any flag or mistyped path failed open.** `argv` was never validated and `ENOENT` was swallowed unconditionally, so `node scripts/check-repo-hygiene.mjs --help does/not/exist.ts` printed `2 path(s) checked, 0 violations` and exited 0 — the failure mode of a guard wired into a new hook with a slightly wrong path. Arguments beginning with `-` are now a usage error (exit `2`); three cases pin it.
  - `[medium]` `[patch]` **The success line overstated coverage by exactly the number of files never opened.** It printed `paths.length` — paths _submitted_ — so today's `5563 path(s) checked` counted 114 allowlisted binaries that were never read, and the story's own Verification Results quoted that figure as evidence. `checkPaths` now fills a `stats` object and the summary reads `N file(s) read, 0 violations (M skipped: … allowlisted binary, … non-regular, … missing)`.
  - `[medium]` `[patch]` **A non-UTF-8 _filename_ was silently skipped — a fail-open in the guard's own subject matter.** `git ls-files` output was force-decoded with `encoding: "utf8"`, replacing bad name bytes with `U+FFFD`; the resulting path does not exist and was swallowed as ENOENT, contradicting the code comment claiming odd filenames survive. Such a path is now an `undecodable-path` violation.
  - `[medium]` `[patch]` **`control-byte` columns were UTF-16 code units while `invalid-utf8` columns were bytes**, both printed in the same `path:line:col` format, and the Completion Notes described the former as character-based (it was neither). Measured: `🎬🎬x<NUL>` reported column 6; the byte column is 10 and the character column 4. Both kinds now report bytes; a new emoji fixture pins it and the note is corrected.
  - `[low]` `[patch]` **A leading UTF-8 BOM was stripped before the scan, shifting every line-1 column by one** — `TextDecoder("utf-8")` defaults to `ignoreBOM: false`. Verified: `BOM+ab+NUL` and `ab+NUL` both reported column 3. Decoding now uses `ignoreBOM: true`. This also invalidated DW-196's stated mechanism ("decodes to U+FEFF … so the guard passes it"), which would have sent a future implementer to a fix that misses the only BOM position that matters; DW-196 is corrected in place.
  - `[low]` `[patch]` **Symlinks were read through to their targets.** Git stores a symlink's blob as its target _string_ — always text — but `readFileSync` follows the link, so a tracked symlink to an out-of-repo binary would be reported as an unfixable violation, and one pointing at a FIFO would block the CI step until timeout. `checkPaths` now `lstat`s and skips non-regular entries, counted under `non-regular`.
  - `[low]` `[patch]` **An unreadable file aborted the whole scan and discarded findings already collected.** Every non-EISDIR/ENOENT read error was rethrown, so a single EACCES mid-run threw away the violations found before it. Such a failure is now an `unreadable` violation — still fail-closed, but the report survives. A new test (skipped when running as root) pins it.
  - `[low]` `[patch]` **`git` missing or a non-git cwd produced a raw stack trace.** Now an actionable message and exit `2`.
  - `[low]` `[patch]` **Conflicted paths were enumerated up to three times.** Mid-merge `git ls-files -z` emits stage-1/2/3 entries, tripling both the count and every report line for one byte. Enumeration is now de-duplicated through a `Set`; a test asserts uniqueness.
  - `[low]` `[patch]` **`firstInvalidUtf8Offset` returning `-1` reported the violation at the file's first, valid byte.** It now reports `unknown offset` with no position, so the fail-closed exit never names an innocent byte.
  - `[low]` `[patch]` **Nothing verified the guard was still wired in** — the 1.12 lesson (DW-191) applied to this story's three gates. A new `wiring` suite asserts `package.json` declares both scripts, `ci.yml` runs both, and `.lintstagedrc.js` has exactly one hygiene entry whose pattern is **slash-free** (the property, not the literal `"*"`, is what makes lint-staged basename-match it to nested files). Also patched: two documentation defects the reviewers caught in this spec — a stray `</content>`/`</invoke>` pair left inside the Verification section, and a Deviations note that wrongly claimed `.lintstagedrc.js` is outside the repo's format glob (it is matched; what makes the deviation safe is that the file was already prettier-dirty at `4b6ce10`, verified).

### 2026-08-03 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 0, medium 4, low 11)
- defer: 3: (high 0, medium 1, low 2)
- reject: 5: (high 0, medium 0, low 5)
- addressed_findings:
  - `[medium]` `[patch]` **Explicit-path mode still failed open on a mistyped path.** The previous pass's triage claimed "any flag or mistyped path failed open" was closed; only the flag half landed. Verified: `node scripts/check-repo-hygiene.mjs does/not/exist.ts` printed `0 file(s) read, 0 violations` and exited 0 — the exact scenario the finding described, in the mode the pre-commit hook actually uses. Whole-repo mode grew an empty-enumeration refusal; explicit mode did not. Now exits `2` when **every** submitted path is missing. Deliberately keyed on all-missing rather than "read nothing", so a commit staging only an allowlisted binary, or a deletion alongside real files, still passes — both pinned by tests.
  - `[medium]` `[patch]` **The CI wiring assertion was satisfied by the wrong step.** `/run: yarn hygiene\b/` matches inside `run: yarn hygiene:test` (`\b` sits between `e` and `:`), so deleting the whole-tree `Repo hygiene` step left the suite green — the exact DW-191 failure the wiring suite exists to prevent. It also grepped the whole file, asserting neither the `lint` job nor the before-`yarn install` ordering that AC 2 and the Design Notes require. Now line-anchored on the exact `run:` value, with job-membership and install-ordering assertions. Probed: deleting the step fails the suite.
  - `[medium]` `[patch]` **The `--concurrent false` ordering dependency was documented and unverified.** `.lintstagedrc.js` declares serial execution load-bearing (its `"*"` entry overlaps the prettier entry, and prettier rewrites in place, so a concurrent run can read a half-written buffer) and says "do not drop that flag" — but nothing read `.husky/pre-commit`. A plausible "speed up the hook" edit would have produced intermittent bogus violations, the failure mode most likely to push a developer to `--no-verify`. The wiring suite now pins the flag. Probed: dropping it fails the suite.
  - `[medium]` `[patch]` **Only the first violation per file was ever reported.** The paydown targets held 6 and 3 control bytes in one file each; under this guard that is a six-iteration run-fix-rerun loop against bytes that are invisible in every editor — the worst possible ergonomics for the one defect class the story exists to close. `checkBuffer`'s spec-mandated single-result shape is unchanged; it now carries a `more` count and the report appends `(+N more in this file)`.
  - `[low]` `[patch]` **`undecodable-path` false-positived on a filename genuinely containing U+FFFD.** Detection was a bare `path.includes("�")` substring test, but U+FFFD is itself legal UTF-8, so a well-encoded file named with one was reported as an unfixable violation whose remediation ("rename it to a UTF-8 name") is nonsense. The check is now qualified by non-existence — the lossy-decode artifact names nothing on disk, a real file does — which keeps the fail-closed behaviour and removes the false positive.
  - `[low]` `[patch]` **No end-of-options marker.** `--` was itself rejected as a flag, so a path beginning with a dash could never be checked in explicit mode. `--` now ends option parsing.
  - `[low]` `[patch]` **`.lintstagedrc.js` claimed hook and CI enforce "identical strictness" — false in the window that matters most.** `.husky/pre-commit` skips `lint-staged` entirely during merge/rebase/cherry-pick/revert, which is exactly when a human hand-edits a conflicted hunk. Comment corrected to say what is actually true; the gap itself is pre-existing hook design, deferred as DW-204.
  - `[low]` `[patch]` **The read-count floor was ~5x too loose to catch what it was added for.** `read > 1000` against an actual 5450 would pass a regression that enumerated a fifth of the tree, while the comment claimed it pinned the count. The self-check now reconciles `read + skipped` against the live `git ls-files` count.
  - `[low]` `[patch]` **`unreadable` and `undecodable-path` were counted in no bucket at all**, so `checked + binary + nonRegular + missing` silently stopped equalling `paths.length` — the same accounting class the previous pass patched, left half-closed. Added `stats.failed`, plus a test asserting every submitted path lands in exactly one counter.
  - `[low]` `[patch]` **The symlink skip was justified by a false claim** ("a symlink's blob is text by construction" — git stores the target's raw bytes, which are not guaranteed to be UTF-8). Skipping remains correct; the rationale now says what it actually does and does not cover, and the uncovered half is deferred as DW-205.
  - `[low]` `[patch]` **The remediation footer invited blinding the guard without saying so.** "add its extension to BINARY_EXTENSIONS" is the first advice a failing committer sees from a red CI log, and nothing there mentioned that it makes the guard skip every file at that extension permanently (the DW-198(a) hole). The fail-closed rationale lived only in the file header. Footer now states the consequence and prefers re-saving.
  - `[low]` `[patch]` **Documentation was stale after the previous review pass in the sections a maintainer reads first.** File List said "33-case suite" and "DW-196 … DW-199"; the actuals were 45 and DW-196 … DW-202, correct only in a separate appendix. Corrected, and the Debug Log transcripts are now marked as the historical runs they are.
  - `[low]` `[patch]` **`main()` leaked a moved process cwd.** `process.chdir(root)` inside an exported function survives the call — harmless for the CLI, a trap for any in-process consumer, and the smell the suite already worked around by hand-saving cwd. Now restored in a `finally`.
  - `[low]` `[patch]` **The summary line did not name the tree it had inspected.** Run inside a submodule or a nested checkout, the guard scans a different repo and still prints a clean verdict. Whole-repo mode now prints the resolved root.
  - `[low]` `[patch]` **`formatReport`'s positionless branch had no coverage**, so a regression printing `path:0:0` for `unreadable` / `undecodable-path` would have shipped silently. Covered, together with the new `(+N more)` suffix.

### 2026-08-03 — Review pass (second follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 1, medium 6, low 8)
- defer: 4: (high 0, medium 2, low 2)
- reject: 7: (high 0, medium 0, low 7)
- addressed_findings:
  - `[high]` `[patch]` **Whole-repo mode reported the repository clean after reading zero files.** All three reviewers found this independently. The previous pass added the all-missing refusal to explicit mode only; whole-repo mode's sole floor is the empty-`git ls-files` check, which does not fire when enumeration _succeeds_ but no path resolves on disk (sparse checkout, a swept `skip-worktree`, any cwd regression). Reproduced in a scratch repo: `0 file(s) read, 0 violations`, **exit 0** — the CI gate the whole story exists to install, passing having opened no file at all, and a direct violation of the intent contract's "a silent pass on an unreadable file is forbidden". `main()` now refuses with exit `2` whenever repo mode read nothing.
  - `[medium]` `[patch]` **Explicit mode reached the identical fail-open through a different counter.** The refusal was keyed on `stats.missing === paths.length`, so a hook path typo that lands on an existing **directory** counted as `nonRegular` and exited 0 (`node scripts/check-repo-hygiene.mjs scripts` → `0 file(s) read, 0 violations`, exit 0). Re-keyed on `checked === 0 && binary === 0`, which covers directories, symlinks and gitlinks while deliberately preserving the two legitimate passes — a binary-only staging and a deletion beside real files — both still pinned by tests. The all-missing wording is retained for that case so the operator still gets the specific diagnosis.
  - `[medium]` `[patch]` **The guard was a silent no-op when reached through a symlink.** `import.meta.url` is the realpath while `process.argv[1]` is the path as invoked, so `invokedDirectly` was false behind any bin shim or packaged hook: the script printed nothing and exited 0 on a file carrying a raw NUL. Now compares against `realpathSync(process.argv[1])`.
  - `[medium]` `[patch]` **`main()` still leaked the moved process cwd** — the previous pass recorded this as fixed, but the restoring `finally` wraps only the `checkPaths` call, while `process.chdir(root)` happens earlier and both enumeration refusals return in between. Verified leaking from a subdirectory. Restoration is now a `restoreCwd()` helper called on every exit path.
  - `[medium]` `[patch]` **The self-check's new reconciliation was not the floor it replaced.** The previous pass removed `read > 1000` as "~5x too loose" and substituted `read + skipped === tracked` — which holds for _any_ split, including `read = 0, skipped = tracked`. Demonstrated: widening `BINARY_EXTENSIONS` to swallow the source tree collapses the scan to 210 of 5564 files and the assertion still passes. Both now hold, plus `missing === 0` and a `read >= tracked * 0.8` coverage floor.
  - `[medium]` `[patch]` **Whole-repo mode's two anti-fail-open refusals were executed by no test.** Every CLI case runs inside this repo, where `git ls-files` always returns thousands of paths, so neither the empty-enumeration nor the not-a-work-tree branch was ever entered — deleting either left the suite green, one level down from the DW-191 shape the wiring suite exists to prevent. New `whole-repo mode refuses…` suite covers all three refusals plus the cwd restoration, on `git init` fixtures under `os.tmpdir()`.
  - `[medium]` `[patch]` **`--concurrent false` pins serialism but not ORDER.** lint-staged runs entries in config key order, and nothing asserted the hygiene entry follows the prettier entry; swapping the two keys — a plausible tidy-up, since the hygiene entry carries the long comment — silently makes the guard read pre-prettier content, the exact hazard the flag exists to prevent. The wiring test now pins the ordering. The residual half (lint-staged invoked outside the husky hook is concurrent regardless) is deferred as DW-215.
  - `[low]` `[patch]` **A bare `--` silently widened an explicit request to a whole-tree scan.** `pathArgs.length > 0` was the only mode discriminator, so a wrapper building `["--", ...paths]` from an empty list got the opposite scoping from the one it asked for, with no diagnostic. `--` now selects explicit mode on its own and an empty path list is a usage error.
  - `[low]` `[patch]` **A second `--` became an unresolvable path.** Only `indexOf("--")` was consumed and later occurrences were never flag-checked, so a stray token landed in `stats.missing` — inflating the very counter the all-missing refusal keys on. Now a usage error.
  - `[low]` `[patch]` **Duplicate explicit paths were read and reported twice.** `trackedPaths()` de-duplicates through a `Set`; explicit mode never passes through it, so any caller concatenating path lists overstated coverage and would have printed the same violation twice. Explicit paths are now de-duplicated too.
  - `[low]` `[patch]` **The violation branch printed no coverage figure**, so a run reporting one violation after reading four files was indistinguishable from one that read five thousand — the same ambiguity the success-line patch removed, left open on the failing branch. Both branches now print it.
  - `[low]` `[patch]` **The CI job detector matched non-job keys.** `/^ {2}([a-z0-9-]+):\s*$/` also matches `push:` / `pull_request:` / `workflow_dispatch:` under `on:`; `jobOf` happened to give the right answer only because it takes the last match before the step. Anchored to the `jobs:` block.
  - `[low]` `[patch]` **Auto Run Result cited a commit that is not in the branch.** `c46cf3b` is a dangling commit with the same message as the one that actually landed (`911e36e`), and `final_revision` named `3dd4937` with a later commit on top. Both corrected in this pass's frontmatter and result section. (A reviewer also flagged `review_loop_iteration: 0` as contradicting the recorded passes — it does not: that counter tracks `bad_spec` repair loopbacks, of which this story has had none. Left at `0`.)
  - `[low]` `[patch]` **Every new fix was adversarially mutation-tested.** Eleven independent mutations — one per fix, code and test alike — were applied to the source and the suite re-run; each produced exactly one failure and was restored. Two rounds were needed: the first cwd-restoration test passed against the unfixed code because `process.cwd()` already reports realpaths, so the probe had to be relaunched from a subdirectory to observe the `chdir` at all.
  - `[low]` `[patch]` **Suite grew 54 → 65 cases across 10 → 11 suites**, every added case pinned by the mutation round above.

## Design Notes

**Why an extension allowlist and not git's own binary detection.** `git diff` calls a blob binary when it finds a NUL in the first 8000 bytes — which is exactly the property this guard must _reject_ in a `.ts` file. Reusing git's heuristic would make the guard blind to its only real target. The classification therefore has to come from the path, and the only safe direction for an unknown path is "check it as text".

**The failure shape it catches, from the actual incident.** The two spec files hold this, byte-for-byte:

```
Added a `!/[<U+0000>-<U+001F><U+007F>]/` reject to the guard
```

Rendered in a review UI, in `git diff`, and in every editor those three bytes are invisible or a single glyph — which is precisely why two review passes missed the original. A byte-level gate is the only reviewer that sees them.

**Why not a turbo task or a workspace package.** Both available in-repo precedents are compromised: `turbo test` `dependsOn: ["build"]` and the client build is red at baseline (DW-185), and turbo's input scoping already let a guard replay a stale PASS while the thing it guarded was disabled (DW-191). Two plain `run:` steps in the `Lint` job have neither failure mode and need no lockfile, so they also run before `yarn install` can fail.

## Verification

**Commands:** (`yarn` is not resolvable via asdf in this workspace — use `corepack yarn`, per 1.11)

- `corepack yarn hygiene` -- expected: exit 0, all tracked files clean (post-paydown).
- `corepack yarn hygiene:test` -- expected: full suite passes, 0 failures, every I/O-matrix row represented.
- Negative control A: write a temp tracked-path file containing a raw `U+0000`, run `corepack yarn hygiene` -- expected: **fails** naming `path:line:col` and `U+0000`; remove it -- expected: passes. Record both in the Debug Log.
- Negative control B: stage that same file and run `npx lint-staged --verbose --concurrent false` -- expected: **fails** through `check-repo-hygiene.mjs`; unstage -- expected: passes. Record both.
- Negative control C: re-insert one raw control byte into `spec-5-6-schedule-change-notifications.md`, run `corepack yarn hygiene` -- expected: **fails** at that line; revert -- expected: passes.
- Branch-removal probe: delete the control-byte branch from `checkBuffer`, run `corepack yarn hygiene:test` -- expected: the control-byte cases **fail**; restore -- expected: green.
- `corepack yarn lint`, `corepack yarn type-check` -- expected: unchanged from baseline `4b6ce10` (no workspace file is touched).
- `npx prettier --check` over touched paths -- expected: pass (note `.mjs` is outside the repo's format glob — DW-188).
- `git diff HEAD --stat -- turbo.json apps packages yarn.lock` -- expected: empty.

**Manual checks (if no CLI):**

- Read the diff of both spec files and confirm only the raw bytes changed: same words, same line count, same backticks. Any other edit is a spec violation.
- Read the CI diff and confirm the two new steps sit inside the `Lint` job only, and that no existing step was reordered or removed.

## Completion Notes

### What landed

One dependency-free guard, wired at the three levels the 1.10–1.12 gates use, plus the paydown that makes it green from its first commit.

- **`scripts/check-repo-hygiene.mjs`** — the whole invariant in one file. Exports `BINARY_EXTENSIONS`, `isBinaryPath(relPath)`, `checkBuffer(buf)`, `checkPaths(paths)`, `trackedPaths()`, `formatReport(violations)` and `main(argv)`. `checkBuffer` decodes with `new TextDecoder("utf-8", { fatal: true })`; on a throw it re-walks the buffer with a hand-rolled UTF-8 validator (`firstInvalidUtf8Offset`) purely to turn "somewhere in this buffer" into a reportable `line:col` and the offending byte, then falls through to `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/` for `control-byte`. Reports `path:line:byte-column  kind  U+XXXX` (or `0xNN` for `invalid-utf8`) plus a remediation footer naming `BINARY_EXTENSIONS`, and sets `process.exitCode = 1`. Non-regular entries (directories/gitlinks, symlinks, devices) and paths that no longer exist (a staged deletion) are skipped and counted; every other read failure becomes an `unreadable` violation, so an unreadable file can never pass silently and a single bad file cannot discard the findings collected before it. A flag-shaped argument, a non-git cwd and an empty enumeration are all usage errors (exit `2`) rather than silent passes. _(The skip policy, the byte columns and the exit-`2` cases were established by the review pass — see the Review Triage Log.)_
- **`scripts/check-repo-hygiene.test.mjs`** — 45 `node:test` cases over 9 suites, covering every row of the I/O matrix plus a UTF-16LE round-trip, byte-column and BOM-column fixtures, an `execFileSync` end-to-end of the CLI (exit code + message shape), a cwd-independence pair, a **wiring** suite asserting all three gates still invoke the guard, and a **repo self-check** that runs the CLI over the real tree, asserts exit 0 and pins the read count above 1000. Fixtures live under `os.tmpdir()`, so `git ls-files` can never see them.
- **`package.json`** — `hygiene` and `hygiene:test` scripts, inserted in place with no other key touched (see Deviations).
- **`.github/workflows/ci.yml`** — `Repo hygiene` and `Repo hygiene tests` steps in the `Lint` job only, between `Setup Node.js environment` and `Install dependencies (immutable)`.
- **`.lintstagedrc.js`** — a second entry, `"*": ["node scripts/check-repo-hygiene.mjs"]`, so the hook enforces exactly what CI enforces.
- **Paydown** — the 9 literal control bytes are gone: 6 in `spec-4-3-password-reset-flow.md` (lines 146, 260) and 3 in `spec-5-6-schedule-change-notifications.md` (line 299), each raw byte replaced by its escape _text_ (`\x00`, `\x1f`, `\x7f`). Purely byte-for-byte: 3 lines changed across 2 files, no word altered, no line added or removed.
- **`deferred-work.md`** — DW-196 … DW-199 for the four deliberate exclusions at implementation; DW-200 … DW-205 added by the two review passes.
- **`sprint-status.yaml`** — story flipped to `done`; the Epic 5 repo-hygiene retro action item flipped `specced` → `done`.

### Decisions

- **The paydown was done by a byte-level script, not by hand.** The bytes are invisible in every editor and in the `Edit` tool's exact-match interface (a `\x00` cannot be typed into a search string), so the replacement ran as a buffer filter over the three byte values. Verified by re-running the byte scanner: 9 hits before, 0 after, and the surrounding prose reads `` `!/[\x00-\x1f\x7f]/` `` where it previously read the same class in raw bytes.
- **`firstInvalidUtf8Offset` is reporting machinery, not a second decoder.** `TextDecoder` remains the authority on whether a buffer is valid UTF-8 — the hand-rolled walker only runs _after_ it has already thrown, to locate the offset it does not expose. If the walker ever disagreed (returned `-1` for a buffer `TextDecoder` rejected) the guard still fails, reporting at offset 0. A silent pass is impossible either way.
- **The control-byte scan runs on the decoded string, the UTF-8 report on the raw bytes — but both report positions in BYTES.** (Corrected in the review pass: the first implementation reported `control-byte` columns in UTF-16 code units, so a line containing an emoji before the violation pointed past the byte, and the two kinds silently used different units in the same `path:line:col` format.) A buffer that does not decode has no characters to count, so bytes are the only unit both kinds can share — and bytes are the unit that locates an invisible byte in a hex dump.
- **The CI steps sit before `yarn install` and outside turbo**, as the spec's Design Notes require: `turbo test dependsOn: ["build"]` with a red client build (DW-185), and turbo input-scoping already produced a stale-cache guard hole (DW-191). Two plain `run:` steps inherit neither failure mode, and they need no lockfile.
- **`.mjs` is outside both the lint and the format globs** (DW-188), so the guard's own two files are gated by `hygiene:test` and by prettier run explicitly on their paths — recorded, not fixed, because closing it means editing `turbo.json`/`packages/**`.

### Deviations from the spec

- **The lint-staged pattern stayed `"*"` — the spec's claim was verified, not corrected.** The instruction was to confirm empirically that a slash-free pattern reaches nested staged files. Negative control B did exactly that: with `"*"` in place and `scripts/probe/nested/probe-hygiene.txt` staged, lint-staged reported `* — 3 files` and the guard failed on the nested path (full output in the Debug Log). lint-staged matches slash-free patterns against the basename, so `"*"` reaches every depth. No `**/*` fallback was needed.
- **`npx prettier --write` was NOT left applied to `package.json` and `.lintstagedrc.js`.** (Corrected in the review pass: the original note claimed both sit outside the repo's format glob. Only `package.json` does — `.json` is not in `**/*.{js,jsx,ts,tsx,md,css,scss}`. `.lintstagedrc.js` **is** matched: `npx prettier --list-different "**/*.{js,jsx,ts,tsx,md,css,scss}"` lists it. What actually makes this safe is that it was **already prettier-dirty at the `4b6ce10` blob** — verified — so `yarn format:check` was red on it before this story and is no more red after, and this diff introduces no regression. It remains part of the pre-existing repo-wide `format:check` backlog, DW-175.) Neither file is prettier-clean at baseline. Running prettier on them reordered every script key in `package.json` (via `prettier-plugin-packagejson`) and re-wrapped a pre-existing line in `.lintstagedrc.js` — churn unrelated to this story. Both were reverted to baseline and the additions re-applied by hand, leaving a 2-line and a 9-line diff respectively. `prettier --write` **was** applied, and kept, on the two new `.mjs` files.
- **The "unknown binary type" matrix row uses `.heic`, not `.woff2`.** The row names `foo/bar.woff2` as the unknown type, but the very next task in the same list mandates `woff2` in `BINARY_EXTENSIONS`. The tasks won (`woff2` is allowlisted and asserted as such); the fail-closed behaviour the row is really about is proven with `.heic` and `.bin`, which are genuinely absent from the allowlist.
- **`prettier --write` was run on this spec file itself, which re-padded the I/O-matrix table inside the read-only `<intent-contract>` block.** The frozen spec was not prettier-formatted, but every committed sibling spec is (`spec-1-11…`, `spec-1-12…` both pass `--check`), and `.md` under `_bmad-output/` is inside the repo's `format:check` glob — so leaving it unformatted would red CI's `Format check` step the moment it is committed. Only column padding changed: no word, cell, row or ordering inside the contract differs.
- **New files were `git add`-ed (never committed) during verification.** `yarn hygiene` enumerates `git ls-files`, so the guard cannot see its own new source until it is at least staged. Staging is also what negative control B requires. Nothing was committed.

### Residual risks

- **The allowlist is spoofable in both directions** (DW-198). A text file named `logo.png` is never opened; a binary blob named `handler.ts` passes if its bytes happen to be valid UTF-8. Direction one is the deliberate price of an allowlist — the alternative is git's NUL heuristic, which would blind the guard to its only real target.
- **A BOM still passes** (DW-196) and **lone CR still passes** (DW-197). Both are named non-goals of this story, but a lone-CR file also degrades the guard's own reporting: every violation in it is reported at `line 1`.
- **The guard judges the working tree, not the committed blob** (DW-200). A tracked path missing from a sparse or partial checkout is counted under `missing` and never read — now visible in the summary line, but still a green exit over a partially-inspected tree.
- **`hygiene:test` runs only in CI** (DW-201): `yarn test` does not reach it, and `.mjs` is outside both the lint and format globs (DW-188), so the guard's own files have no static gate.
- **`yarn hygiene` is blind to untracked files** (DW-199), so a local green run can coexist with a violating file that has not been `git add`-ed. lint-staged closes this at commit time and CI closes it after, but the local signal can mislead.
- **The guard's own files are outside `turbo lint` and `format:check`** (DW-188). Only `hygiene:test` protects them; a syntax error in the guard surfaces as a CI hygiene-step failure rather than as a lint failure.
- **Invisible-but-legal Unicode still passes** (DW-203). Bidi overrides and isolates (Trojan Source), zero-width characters, the C1 range and `U+2028`/`U+2029` are all well-formed UTF-8 and outside the contract's C0/DEL class. A reader may reasonably assume a byte-level hygiene gate covers Trojan Source; it does not.
- **The pre-commit half of the gate is off during merge, rebase, cherry-pick and revert** (DW-204) — the hook skips `lint-staged` wholesale there, which is exactly when a human hand-edits a conflicted hunk. CI still catches it on push, so this is latency, not a hole.
- **A tracked symlink's own blob is never validated** (DW-205). Skipping non-regular files stops the guard from reading through the link, but git stores the target path's raw bytes as the blob, and those bytes go unchecked. No symlinks are tracked today.
- **Speed is unbounded by design.** Whole-repo mode reads all 5563 tracked files serially (~0.4 s today). It scales linearly with repo size and with any large text file added, since the whole buffer is read into memory.

## Debug Log

> These are verbatim transcripts of the runs made at **first implementation**, kept as the historical record they are. The suite counts and summary-line wording they show (`33 tests`, `N path(s) checked`) were superseded by the two review passes — see the two Verification tables at the end of this file for the current figures.

### Negative control A — a raw `U+0000` at a tracked path

Failing run (`scripts/probe/nested/probe-hygiene.txt` written with a NUL, then `git add`-ed):

```text
--- PROBE A: failing run ---
yarn run v1.22.22
$ node scripts/check-repo-hygiene.mjs
scripts/probe/nested/probe-hygiene.txt:1:23  control-byte  U+0000

1 repo-hygiene violation(s). Every tracked file must be strict UTF-8
with no control bytes other than tab, LF and CR (\t \n \r).
- control-byte: replace the raw byte with its escape text (\x00, \x1f, \x7f).
- invalid-utf8: if this file is a binary asset, add its extension to
  BINARY_EXTENSIONS in scripts/check-repo-hygiene.mjs; otherwise re-save it as UTF-8.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
exit=1
```

Passing run (probe file un-staged and deleted):

```text
--- PROBE A: reverted, passing run ---
yarn run v1.22.22
$ node scripts/check-repo-hygiene.mjs
repo hygiene: 5563 path(s) checked, 0 violations
Done in 0.36s.
exit=0
```

### Negative control B — the same file staged, through the pre-commit path

Failing run (`npx lint-staged --verbose --concurrent false`, with the nested probe staged alongside the two new guard files). Note `* — 3 files`: the slash-free pattern reached the nested path, which is the claim this probe existed to verify.

```text
--- PROBE B: failing run, pattern "*" ---
[STARTED] Preparing lint-staged...
[COMPLETED] Preparing lint-staged...
[STARTED] Running tasks for staged files...
[STARTED] .lintstagedrc.js — 3 files
[STARTED] *.{js,jsx,ts,tsx,md,css,scss} — 0 files
[SKIPPED] *.{js,jsx,ts,tsx,md,css,scss} — no files
[STARTED] * — 3 files
[STARTED] node scripts/check-repo-hygiene.mjs
[FAILED] node scripts/check-repo-hygiene.mjs [FAILED]
[FAILED] node scripts/check-repo-hygiene.mjs [FAILED]
[COMPLETED] Running tasks for staged files...
[STARTED] Applying modifications from tasks...
[SKIPPED] Skipped because of errors from tasks.
[STARTED] Reverting to original state because of errors...
[COMPLETED] Reverting to original state because of errors...
[STARTED] Cleaning up temporary files...
[COMPLETED] Cleaning up temporary files...

✖ node scripts/check-repo-hygiene.mjs:
/Users/ayoub/projects/tiween-bmad-version/scripts/probe/nested/probe-hygiene.txt:1:23  control-byte  U+0000

1 repo-hygiene violation(s). Every tracked file must be strict UTF-8
with no control bytes other than tab, LF and CR (\t \n \r).
- control-byte: replace the raw byte with its escape text (\x00, \x1f, \x7f).
- invalid-utf8: if this file is a binary asset, add its extension to
  BINARY_EXTENSIONS in scripts/check-repo-hygiene.mjs; otherwise re-save it as UTF-8.
```

Passing run (probe un-staged; the two guard files remain staged):

```text
--- PROBE B: reverted, passing run ---
[STARTED] Preparing lint-staged...
[COMPLETED] Preparing lint-staged...
[STARTED] Running tasks for staged files...
[STARTED] .lintstagedrc.js — 2 files
[STARTED] *.{js,jsx,ts,tsx,md,css,scss} — 0 files
[SKIPPED] *.{js,jsx,ts,tsx,md,css,scss} — no files
[STARTED] * — 2 files
[STARTED] node scripts/check-repo-hygiene.mjs
[COMPLETED] node scripts/check-repo-hygiene.mjs
[COMPLETED] * — 2 files
[COMPLETED] .lintstagedrc.js — 2 files
[COMPLETED] Running tasks for staged files...
[STARTED] Applying modifications from tasks...
[COMPLETED] Applying modifications from tasks...
[STARTED] Cleaning up temporary files...
[COMPLETED] Cleaning up temporary files...

→ node scripts/check-repo-hygiene.mjs:
repo hygiene: 2 path(s) checked, 0 violations
```

### Negative control C — re-inserting one raw byte into the paid-down spec file

A single `U+0000` re-inserted into `spec-5-6-schedule-change-notifications.md` line 299 (in place of the space in "Replaced the literal-byte class"), then removed. SHA-256 of the file is recorded on both sides to prove the revert was exact.

```text
--- baseline sha ---
sha 20bd9273a003f236a721b266bd697ab85d33739f6b55ad0e84d093e564a152fd
--- PROBE C: insert, failing run ---
inserted; sha now c6d30f590412f57b308dbdf2cab56960f66b9fa3d75b122c1e82f32da980d12c
yarn run v1.22.22
$ node scripts/check-repo-hygiene.mjs
_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md:299:346  control-byte  U+0000

1 repo-hygiene violation(s). Every tracked file must be strict UTF-8
with no control bytes other than tab, LF and CR (\t \n \r).
- control-byte: replace the raw byte with its escape text (\x00, \x1f, \x7f).
- invalid-utf8: if this file is a binary asset, add its extension to
  BINARY_EXTENSIONS in scripts/check-repo-hygiene.mjs; otherwise re-save it as UTF-8.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
exit=1
--- PROBE C: revert, passing run ---
reverted; sha now 20bd9273a003f236a721b266bd697ab85d33739f6b55ad0e84d093e564a152fd
yarn run v1.22.22
$ node scripts/check-repo-hygiene.mjs
repo hygiene: 5563 path(s) checked, 0 violations
Done in 0.35s.
exit=0
```

### Branch-removal probe — the control-byte branch deleted from `checkBuffer`

`const index = text.search(CONTROL_BYTE)` replaced by `const index = -1`, so the function can only ever report `invalid-utf8`:

```text
--- BRANCH-REMOVAL PROBE: control-byte branch deleted ---
not ok 2 - checkBuffer — control bytes
not ok 5 - checkPaths
not ok 6 - CLI
# tests 33
# pass 22
# fail 11
---
exit=1
```

Restored:

```text
--- restored ---
# tests 33
# suites 6
# pass 33
# fail 0
exit=0
```

11 of 33 cases fail without the branch — every control-byte case in `checkBuffer`, the `checkPaths` case that asserts one violation per offending path, and the two CLI cases that assert the `path:line:col control-byte U+0000` message. The `invalid-utf8` suites stay green, which is the point: the two branches are independently load-bearing.

## Verification Results

| Command                                                             | Expected                                                       | Actual                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `corepack yarn hygiene`                                             | exit 0, all tracked files clean                                | **PASS** — `repo hygiene: 5563 path(s) checked, 0 violations`, exit 0 (5561 tracked + the 2 staged guard files)      |
| `corepack yarn hygiene:test`                                        | full suite passes, every I/O-matrix row represented            | **PASS** — 33 tests / 6 suites, 0 fail                                                                               |
| Negative control A (raw `U+0000` at a tracked path → remove)        | fails naming `path:line:col` + `U+0000`; passes after removal  | **PASS both sides** — `scripts/probe/nested/probe-hygiene.txt:1:23  control-byte  U+0000`, exit 1 → exit 0           |
| Negative control B (`npx lint-staged --verbose --concurrent false`) | fails through `check-repo-hygiene.mjs`; passes after unstaging | **PASS both sides** — `* — 3 files` then `[FAILED] node scripts/check-repo-hygiene.mjs` → all `[COMPLETED]`          |
| Negative control B, sub-claim: `"*"` reaches nested staged paths    | the spec's basename-matching claim holds                       | **CONFIRMED** — the nested probe was matched and reported; no `**/*` fallback needed                                 |
| Negative control C (re-insert a byte into `spec-5-6…md` → revert)   | fails at that line; passes after revert                        | **PASS both sides** — `…spec-5-6-…md:299:346  control-byte  U+0000`, exit 1 → exit 0; SHA-256 identical after revert |
| Branch-removal probe (control-byte branch deleted → restored)       | the control-byte cases fail; green once restored               | **PASS** — 11/33 fail (all control-byte cases), `invalid-utf8` suites unaffected; restored → 33/33                   |
| `corepack yarn lint`                                                | unchanged from baseline `4b6ce10`                              | **PASS** — 2 successful, 2 total (FULL TURBO)                                                                        |
| `corepack yarn type-check`                                          | unchanged from baseline `4b6ce10`                              | **PASS** — 2 successful, 2 total                                                                                     |
| `npx prettier --check` over the touched paths                       | pass                                                           | **PASS** — both `.mjs` files, both spec files, `deferred-work.md`, `ci.yml`                                          |
| `git diff HEAD --stat -- turbo.json apps packages yarn.lock`        | empty                                                          | **PASS** — empty                                                                                                     |
| byte scan of the two paid-down spec files                           | 9 control bytes before, 0 after; prose identical               | **PASS** — 0 hits; `git diff` shows 3 changed lines, same words, same line count                                     |

> **Note on the `apps`/`packages` diff check.** It was **empty** when run against this story's work. A later re-run showed a staged rename under `apps/strapi/src/plugins/events-manager/.../rate-limit.ts` plus untracked `apps/strapi/src/plugins/venues/**` and `epic-7` / `spec-7-1-…` artifacts, none of them touched by this story — a concurrent session working in the same worktree introduced them mid-run. Every file this story owns is listed in the File List below; nothing under `apps/`, `packages/`, `turbo.json` or `yarn.lock` is among them.

## File List

**Created**

- `scripts/check-repo-hygiene.mjs` — the guard: strict-UTF-8 + control-byte checker, fail-closed extension allowlist, whole-repo and explicit-path modes.
- `scripts/check-repo-hygiene.test.mjs` — `node:test` suite covering every I/O-matrix row, the CLI end-to-end, the three wiring gates, and a self-check over the real tree. **54 cases across 10 suites** as of the follow-up review pass (33 at first implementation, 45 after the first review pass).

**Modified**

- `package.json` — added the `hygiene` and `hygiene:test` scripts (2 lines; no other key touched).
- `.github/workflows/ci.yml` — added `Repo hygiene` and `Repo hygiene tests` steps to the `Lint` job, before `yarn install`.
- `.lintstagedrc.js` — added the `"*"` entry running the guard on staged paths, with the basename-matching rationale.
- `_bmad-output/implementation-artifacts/spec-4-3-password-reset-flow.md` — 6 raw control bytes on lines 146 and 260 replaced by their escape text.
- `_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md` — 3 raw control bytes on line 299 replaced by their escape text.
- `_bmad-output/implementation-artifacts/deferred-work.md` — appended DW-196 (BOM), DW-197 (line endings), DW-198 (allowlist spoofing), DW-199 (untracked files) at implementation; DW-200 … DW-202 in the first review pass; DW-203 (invisible-but-legal Unicode / Trojan Source), DW-204 (hook off during merge/rebase), DW-205 (symlink blob unvalidated) in the follow-up review pass.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story → `done`; Epic 5 repo-hygiene retro action item `specced` → `done`.
- `_bmad-output/implementation-artifacts/spec-1-13-repo-hygiene-encoding-ci-guard.md` — tasks ticked; these completion sections appended.

**Deleted**

- None. (`scripts/probe/nested/probe-hygiene.txt` existed only inside negative controls A and B and was removed with its directory.)

### Files changed during the 2026-08-03 review pass (13 patches, 5 files)

- `scripts/check-repo-hygiene.mjs` — `repoRoot()` added and exported; `trackedPaths()` runs `git ls-files -z --full-name` from the repo root and de-duplicates; `main()` chdirs to the root, rejects flag-shaped arguments (exit `2`), turns git/enumeration failures and an empty enumeration into exit `2`, and reports files **read** plus a skip breakdown; `checkBuffer` decodes with `ignoreBOM: true`, reports byte columns for both kinds, and no longer names a valid byte when the walker and `TextDecoder` disagree; `checkPaths` takes a `stats` object, flags an undecodable filename, `lstat`s and skips non-regular entries, and records an `unreadable` violation instead of throwing; `formatReport` handles positionless kinds and states the byte-offset convention.
- `scripts/check-repo-hygiene.test.mjs` — 33 → 45 cases across 9 suites: byte-column and BOM-column fixtures, flag rejection, cwd-independence, a read-count floor on the whole-repo run, symlink and EACCES and undecodable-path cases, skip-counter assertions, a `trackedPaths` suite, and a `wiring` suite pinning all three gates.
- `.lintstagedrc.js` — documents the `--concurrent false` ordering dependency with the overlapping prettier entry.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-196 corrected (the BOM is stripped by default, so the obvious fix would miss the leading case); DW-200 … DW-202 appended.
- `_bmad-output/implementation-artifacts/spec-1-13-repo-hygiene-encoding-ci-guard.md` — triage log; two documentation defects corrected (stray `</content>`/`</invoke>`, the wrong format-glob claim); Completion Notes and Residual Risks updated.

### Review-pass verification

| Command                                                                    | Result                                                                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `corepack yarn hygiene`                                                    | **PASS** — `repo hygiene (repo): 5450 file(s) read, 0 violations (114 skipped: 114 allowlisted binary, 0 non-regular, 0 missing)` |
| `corepack yarn hygiene:test`                                               | **PASS** — 45 tests / 9 suites, 0 fail (was 33 / 6)                                                                               |
| Branch-removal probe (control-byte branch deleted → restored)              | **PASS** — 13/45 fail without it (was 11/33); restored → 45/45                                                                    |
| Enumeration-break probe (`-z` dropped from `git ls-files`)                 | **NOW CAUGHT** — `yarn hygiene` exits 1 and 3 tests fail; before the patch this printed `1 path(s) checked, 0 violations`, exit 0 |
| Flag probe: `node scripts/check-repo-hygiene.mjs --help`                   | **PASS** — exit `2`, `unknown option --help`; before the patch it printed `1 path(s) checked, 0 violations`, exit 0               |
| cwd probe: `cd scripts && node check-repo-hygiene.mjs`                     | **PASS** — 5450 files read, identical to a root run; before the patch it read 4 files and reported the repo green                 |
| Violation probe: NUL written into a tracked `.md`, staged → `yarn hygiene` | **PASS** — `…/.probe-1-13.md:1:6  control-byte  U+0000`, exit 1; probe removed → exit 0                                           |
| `corepack yarn lint`                                                       | **PASS** — 2 successful, 2 total                                                                                                  |
| `corepack yarn type-check`                                                 | **PASS** — 2 successful, 2 total                                                                                                  |
| `npx prettier --write` over the touched paths                              | **PASS** — clean afterwards; suite still 45/45                                                                                    |

### Files changed during the 2026-08-03 follow-up review pass (15 patches, 4 files)

- `scripts/check-repo-hygiene.mjs` — explicit-path mode refuses (exit `2`) when every submitted path is missing; `--` ends option parsing; `main()` restores the process cwd in a `finally` and names the resolved repo root in the summary; `checkBuffer` carries a `more` count of the further control bytes in the same file; `checkPaths` gained `stats.failed` so every submitted path lands in exactly one counter, and qualifies the `undecodable-path` check by non-existence so a filename genuinely containing U+FFFD is read as text; `formatReport` appends `(+N more in this file)` and warns that allowlisting an extension skips every file at it forever; the symlink-skip rationale no longer claims a symlink blob is text by construction.
- `scripts/check-repo-hygiene.test.mjs` — 45 → 54 cases across 10 suites. The CI wiring assertion is line-anchored on the exact `run:` value and now also asserts job membership and before-install ordering; a new case pins `--concurrent false` in `.husky/pre-commit`; the self-check reconciles `read + skipped` against the live `git ls-files` count instead of a `> 1000` floor; new cases cover `--`, the all-missing refusal, a missing path beside a real one, the `(+N more)` suffix, counter reconciliation, a real U+FFFD filename, and `formatReport`'s positionless branch.
- `.lintstagedrc.js` — the "identical strictness" claim corrected: the hook skips `lint-staged` wholesale during merge/rebase/cherry-pick/revert (DW-204).
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-203 … DW-205 appended. No existing entry modified.

### Follow-up review-pass verification

| Command                                                             | Result                                                                                                                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test scripts/check-repo-hygiene.test.mjs`                   | **PASS** — 54 tests / 10 suites, 0 fail (was 45 / 9)                                                                                                                        |
| `node scripts/check-repo-hygiene.mjs`                               | **PASS** — `repo hygiene (repo /Users/ayoub/projects/tiween-bmad-version): 5450 file(s) read, 0 violations (114 skipped: 114 allowlisted binary, 0 non-regular, 0 missing)` |
| Typo probe: `node scripts/check-repo-hygiene.mjs does/not/exist.ts` | **NOW CAUGHT** — exit `2`, `all 1 submitted path(s) are missing`; before the patch: `0 file(s) read, 0 violations`, exit 0                                                  |
| Regression guard: `… package.json does/not/exist.ts`                | **PASS** — exit 0 (a missing path beside a real one is still a legitimate staged deletion)                                                                                  |
| Regression guard: a single allowlisted binary as the only argument  | **PASS** — exit 0, `0 file(s) read … 1 allowlisted binary`                                                                                                                  |
| CI-wiring probe: `Repo hygiene` step deleted from `ci.yml`          | **NOW CAUGHT** — 1 test fails; before the patch the suite stayed green (the `\b` regex matched the `hygiene:test` line). Restored → 54/54                                   |
| Hook probe: `--concurrent false` dropped from `.husky/pre-commit`   | **NOW CAUGHT** — 1 test fails; before the patch nothing read the hook file. Restored → 54/54                                                                                |
| Violation probe: two NULs written into a tracked `.md`, staged      | **PASS** — `.probe-followup.md:1:2  control-byte  U+0000  (+1 more in this file)`, exit 1; probe removed → exit 0                                                           |
| `node scripts/check-repo-hygiene.mjs --help`                        | **PASS** — exit `2`, `unknown option --help`, usage now documents `[--]`                                                                                                    |
| `corepack yarn lint`                                                | **PASS** — 2 successful, 2 total                                                                                                                                            |
| `corepack yarn type-check`                                          | **PASS** — 2 successful, 2 total                                                                                                                                            |
| `npx prettier --write` over the touched paths                       | **PASS** — clean afterwards; suite still 54/54                                                                                                                              |
| `git diff HEAD --stat -- turbo.json packages yarn.lock`             | **PASS** — empty. Nothing under `apps/` is touched by this pass either; the `apps/` dirt in the work tree belongs to a concurrent Epic 7 session.                           |

## Second follow-up review-pass verification

Mutation round — each fix reverted in isolation, suite re-run, then restored. Every row produced exactly **one** failing test; baseline is 65/65 across 11 suites.

| Mutation                                                  | Result                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Repo-scope read-nothing refusal removed                   | **CAUGHT** — 64/65                                                               |
| Explicit refusal re-keyed to `missing === paths.length`   | **CAUGHT** — 64/65                                                               |
| `realpathSync` dropped from the direct-invocation check   | **CAUGHT** — 64/65                                                               |
| Bare-`--` handling reverted to `pathArgs.length > 0`      | **CAUGHT** — 64/65                                                               |
| Explicit-path de-duplication removed                      | **CAUGHT** — 64/65                                                               |
| Second-`--` rejection removed                             | **CAUGHT** — 64/65                                                               |
| `restoreCwd()` removed from the empty-enumeration return  | **CAUGHT** — 64/65 (only after the probe was moved to a subdirectory; see below) |
| Coverage line removed from the violation branch           | **CAUGHT** — 64/65                                                               |
| lint-staged config keys swapped (hygiene before prettier) | **CAUGHT** — 64/65                                                               |
| `BINARY_EXTENSIONS` widened to swallow the source tree    | **CAUGHT** — 49/65                                                               |
| `jobs:` renamed in `ci.yml` (job-membership anchor)       | **CAUGHT** — 64/65                                                               |

The cwd row is the one that needed a second attempt: `process.cwd()` already returns realpaths, so a probe launched at the scratch repo's root cannot observe the `chdir` and passed against the unfixed code. Relaunching it from a subdirectory makes the leak visible; the test carries a comment saying so.

Behavioural probes (all run against the patched guard):

| Check                                                                   | Result                                                                                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Repo mode, tracked files enumerated but absent from the work tree       | **PASS** — `read 0 of 2 tracked file(s) — refusing…`, exit `2` (was exit `0`, clean verdict)                                |
| Repo mode inside an empty `git init`                                    | **PASS** — `returned no paths`, exit `2`                                                                                    |
| Repo mode outside any work tree                                         | **PASS** — `could not enumerate tracked files`, exit `2`                                                                    |
| Explicit mode, sole argument is a directory                             | **PASS** — `none of the 1 submitted path(s) could be read (0 missing, 1 non-regular)`, exit `2` (was exit `0`)              |
| Explicit mode, sole argument is an allowlisted `.png`                   | **PASS** — exit `0`, `0 file(s) read … 1 allowlisted binary` — the legitimate pass is preserved                             |
| Explicit mode, a missing path beside a real one                         | **PASS** — exit `0` (unchanged)                                                                                             |
| `node scripts/check-repo-hygiene.mjs --`                                | **PASS** — `no paths after --`, exit `2` (was a silent whole-tree scan)                                                     |
| `node scripts/check-repo-hygiene.mjs -- package.json --`                | **PASS** — `` `--` appears more than once ``, exit `2` (was `1 file read, 1 missing`, exit `0`)                             |
| Same path submitted twice                                               | **PASS** — `1 file(s) read` (was `2`)                                                                                       |
| Invocation through a symlink to the script, on a file holding a raw NUL | **PASS** — reports `control-byte U+0000`, exit `1` (printed nothing and exited `0` before)                                  |
| Violation run                                                           | **PASS** — report now ends with `1 file(s) read (0 skipped: …)`                                                             |
| `main([])` called in-process from a subdirectory of an empty repo       | **PASS** — cwd restored                                                                                                     |
| `node --test scripts/check-repo-hygiene.test.mjs`                       | **PASS** — 65 tests / 11 suites, 0 fail                                                                                     |
| `node scripts/check-repo-hygiene.mjs` over the real tree                | **PASS** — 5466 files read, 0 violations, 114 allowlisted skips, 0 missing, exit `0`                                        |
| `npx prettier --check` over the two touched scripts                     | **PASS** — after `--write`; suite re-run 65/65 and guard re-run green afterwards                                            |
| `git status --porcelain`                                                | **PASS** — only this story's 3 files. Nothing under `apps/`, `turbo.json`, `packages/` or `yarn.lock` touched by this pass. |

## Auto Run Result

Status: **done** — second follow-up review pass on an already-`done` story. No implementation loopback (0 intent_gap, 0 bad_spec).

**Change:** 15 review patches. The headline is that the guard's **whole-repo mode** — the CI gate this story exists to install — reported the repository clean after reading zero files. All three reviewers found it independently. Six further patches close the same class through other counters and other entry points; the remaining eight are ergonomics, argument handling, and test-suite hardening.

**Files changed** (4):

- `scripts/check-repo-hygiene.mjs` — repo mode refuses (exit `2`) when it read nothing; explicit mode's refusal re-keyed from `missing === paths.length` to `checked === 0 && binary === 0`, covering directories and symlinks while preserving the binary-only and deletion-beside-real-path passes; direct-invocation check compares against `realpathSync(argv[1])` so the guard is not a silent no-op behind a symlink; `restoreCwd()` on every exit path, not just around `checkPaths`; `--` selects explicit mode on its own and an empty path list is a usage error; a second `--` is rejected; explicit paths are de-duplicated; the coverage figure prints on the violation branch too.
- `scripts/check-repo-hygiene.test.mjs` — 54 → 65 cases / 10 → 11 suites. New `whole-repo mode refuses…` suite (`git init` fixtures under `os.tmpdir()`) covering all three repo-mode refusals plus cwd restoration; seven new CLI cases; the self-check gained `missing === 0` and a `read >= tracked * 0.8` floor beside the reconciliation; the CI job detector anchored to the `jobs:` block; the lint-staged wiring test now pins config **key order**, not just `--concurrent false`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-212 … DW-215 appended. No existing entry read, modified or re-opened.
- this spec — triage log, verification tables, corrected commit SHAs, this section.

**Findings:** 15 patched (1 high, 6 medium, 8 low), 4 deferred (DW-212 … DW-215), 7 rejected, 0 escalated.

Rejected: the mutable `BINARY_EXTENSIONS` export (in-process mutation is not a threat model for a repo guard); allowlist incompleteness across inert formats (fail-closed on unknown types is an explicit intent-contract choice); the escape form the paydown wrote into the two spec files (a reviewer preferred the `\u0000` spelling the live source uses, but the intent contract mandates the `\x00` form); Trojan Source / bidi overrides (already DW-203, and out of contract scope); the `--no-verify` process note from the previous pass (already recorded); `checkBuffer`'s unreachable decoder-disagreement fallback; a >2 GiB tracked text file becoming an `unreadable` violation.

**Verification:** suite 65/65 across 11 suites; guard green over the real tree (5466 files read, 114 allowlisted skips, 0 missing); prettier clean over every touched path, with the suite and the guard both re-run after formatting. **Every one of the 15 fixes was mutation-tested** — reverted in isolation, suite re-run, exactly one failure each, then restored (11 rows in the table above; the four documentation patches are not mutable). That round caught one of this pass's own tests being ineffective: the cwd-restoration probe passed against the unfixed code because `process.cwd()` already reports realpaths, and had to be relaunched from a subdirectory. Full behavioural probe table in **Second follow-up review-pass verification** above.

**Residual risks:** `followup_review_recommended` stays `true`. This is the third consecutive pass in which the previous pass's headline fail-open fix covered only one of the guard's two modes, and this pass changes exit-code semantics in both the commit-blocking hook path and the CI path. DW-198 (allowlist spoofable both ways), DW-200 (working tree, not the committed blob) and DW-203 (Trojan Source) still ship open and unchanged. DW-215 records the half of the prettier-ordering race a patch cannot reach: lint-staged invoked outside `.husky/pre-commit` is concurrent regardless of config key order.

**The guard caught this pass in the act.** While drafting this section the reviewer typed a literal `U+0000` into the prose — trying to _write about_ the escape form, exactly as story 5.6 did — and it rendered as nothing in every view of the text. `node scripts/check-repo-hygiene.mjs` reported `spec-1-13-…md:552:313 control-byte U+0000` and exited `1`, and two suite cases went red with it. That is the story's premise reproduced unprompted, on this story's own artifact, three review passes in: the byte was invisible to the author, invisible in the diff, and caught only by the guard. Byte replaced with the escape text; tree re-verified green.

**Process note:** a concurrent session landed story 7.1 (`2c7a3f3`, `a129627`) on top of this story's baseline during the review. Its commits are unrelated and were excluded from the reviewed diff, which is `4b6ce10..911e36e`. This pass touched only the 4 files listed above.
