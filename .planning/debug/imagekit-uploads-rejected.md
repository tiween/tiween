---
status: awaiting_human_verify
trigger: "ImageKit uploads rejected"
created: 2026-10-23
updated: 2026-10-23
goal: find_and_fix
---

# Debug: imagekit-uploads-rejected

## Symptoms

- **Expected:** `seed:shorts --verify` (plan 01-13 Task 1) against dev Postgres uploads each film's poster/media to ImageKit via the Strapi upload provider, creating rows in the `files` table.
- **Actual:** ImageKit provider config loads (after keys were moved from repo-root `.env` to `apps/strapi/.env`), but every upload is rejected. Log shows 45 `Unable to upload file.` lines; `files` table has 0 rows. Importer crashed on film 9 (`bord-a-bord`) with an unhandled promise rejection.
- **Error messages:** Only ImageKit's error object `message` ("Unable to upload file.") is logged; the provider surfaces no further detail (status code, response body).
- **Timeline:** Never worked. Earlier attempts failed with `UPLOAD_PROVIDER_NOT_IMAGEKIT` (keys in root `.env`, which Strapi never loads); fixed by adding keys to `apps/strapi/.env`. Recorded 2026-10-20.
- **Reproduction:** Run `seed:shorts --verify` in `apps/strapi` against dev Postgres with ImageKit keys in `apps/strapi/.env`.

## Known context

- Candidate causes (unverified): invalid/mismatched public/private keys, wrong `IMAGEKIT_URL_ENDPOINT`, account permissions/quota, network.
- Secondary defect (plan 01-10 importer): an upload failure kills the process instead of landing in the report's `failed` list. In scope for fix.
- Dev DB is partial: 8 films (khalaa … chrifa-bent-el-fadhel) published in fr with ar/en rows but no media (POSTER_REQUIRED bypass); other 5 approved films not imported. Do NOT clean up or mutate dev DB without owner approval.
- Uncommitted: `apps/strapi/scripts/seeds/data/short-films.json` has `approved: true` on 13 owner-approved slugs — leave untouched.
- Never print secret key values in logs or this file.

## Current Focus

status_note: defect 2 fixed and verified (code); defect 1 root cause confirmed and external (ImageKit refuses the configured credential), waiting on owner action in the ImageKit dashboard
hypothesis: (defect 2) Strapi's uploadImage() leaves the provider-upload promise unobserved while it generates thumbnails/formats, so a fast provider rejection becomes an unhandledRejection that crashes Node before the importer's try/catch can record the film as failed
test: real-process repro (scratchpad/repro-orphan.ts, throwaway sqlite, FAKE provider): rejection at 5ms vs 600ms vs 3000ms
expecting: orphans at 5ms only (timing-dependent), none at 600ms+
result: CONFIRMED (5ms: 2 orphaned rejections; 600ms and 3000ms: 0)
next_action: account verified healthy via admin MCP; owner generates a fresh private key (Developer options -> API keys) for account bc2xslzyt, updates IMAGEKIT_PRIVATE_KEY (+ public key) in apps/strapi/.env, then re-runs seed:shorts --verify against dev Postgres (needs owner approval to write to dev DB); then check the `tiween` folder/endpoint-prefix collision
bug_class: defect 1 Bohrbug (deterministic 403); defect 2 timing/order-violation race (deterministic mechanism, timing-dependent trigger)

reasoning_checkpoint:
hypothesis: "Defect 1: every upload fails because ImageKit answers HTTP 403 to the configured private key (key is recognised but its account cannot be authenticated). Defect 2: the importer crashes because @strapi/upload attaches Promise.all to its upload promises only after thumbnail/format generation, so a provider rejection that lands earlier is an unobserved rejection and Node 22 exits; the importer also never classified provider refusals as film failures (it would have warned and published posterless films)."
confirming_evidence: - "Plain fetch and SDK both get 403 'Your account cannot be authenticated.' for GET /v1/files; only the exact configured key gets an x-ik-requestid header, 5 random keys and 3 one-char mutations never do (so not a typo/truncation)." - "repro-orphan.ts: provider rejecting after 5ms -> 2 unhandledRejection events while findOrUploadImage still rejects normally; after 600ms/3000ms -> 0 events." - "45 failed-upload log lines = 9 films x 5 uploads (main + thumbnail + 3 formats of a 1280x720 image), crash on film 9 = lost race."
falsification_test: "Defect 2: with the guard in place, repeat the 5ms repro through importShortFilms against the REAL ImageKit config (403) on sqlite; if the process still dies or the film is not in failed, the hypothesis/fix is wrong. Defect 1: if a freshly copied key from the ImageKit dashboard still gets 403, the cause is account state, not the key."
fix_rationale: "Cannot patch node_modules, so the importer (a) converts provider refusals into a typed MediaUploadError (status + safe message, never the raw axios object that carries the private key) which importFilm lets propagate so the film lands in failed with nothing written, and (b) runs the film loop under guardUnobservedRejections, which keeps the process alive for the duplicate unobserved rejection and records it as a warning. Download failures keep their warning behaviour."
blind_spots: "Cannot see the ImageKit dashboard (account state vs key state is inferred from the x-ik-requestid differential). The guard is process-wide while the loop runs, so an unrelated unobserved rejection in that window is downgraded to a warning (recorded, not silent). The Jest sandbox cannot receive real unhandledRejection events, so the guard itself is verified by a real-process run, not by Jest. The same Strapi race can crash the CMS server when ImageKit refuses an editor upload of a large image (not changed here)."
candidate_causes: - "[config/environment] ImageKit account disabled/suspended or over a limit, or key rotated/deactivated on the ImageKit side (matches 403 + key recognised)" - "[code] Strapi uploadImage() unobserved-promise race (defect 2), importer treating provider refusal as a warning (design gap)" - "[config] key typo/truncation/whitespace/wrong endpoint: ruled out by shape checks and the mutation differential" - "[code] SDK or provider bug: ruled out by plain fetch giving the same 403"
and_gate: "yes for the overall symptom: the crash needs BOTH a rejected upload (defect 1) AND the fast-rejection race (defect 2); fixing either alone removes the crash, but defect 2 stays latent for any future provider outage."

## Evidence

- timestamp: 2026-10-23
  checked: tooling guard
  found: a PreToolUse hook blocks any Bash command that references `.env` (secret-file guard). Respected; env values are only reached through the app's own config loading (Strapi boot), never read or printed by the debugger.
  implication: key shape checks must be done in-process via `strapi.config`, masked.

- timestamp: 2026-10-23
  checked: apps/strapi/config/plugins.ts, node_modules/strapi-provider-upload-imagekit/lib/index.js (v5.11.11, imagekit 6.0.0 via root node_modules; apps/strapi/node_modules has imagekit 5.2.0)
  found: provider logs a fixed 'Unable to upload file.' then rejects with the ORIGINAL imagekit error object (plain object `{message, help, $ResponseMetadata}` in SDK 6.x, not an Error). Provider passes only {file, fileName, folder}.
  implication: the detail exists but is never logged; the importer's errorCode() would see `message` of a plain object.

- timestamp: 2026-10-23
  checked: probe scripts in scratchpad (Strapi booted on a throwaway sqlite DB; app's own provider config; masked output only)
  found: key SHAPE is valid (public* + 28 base64 = 35 chars, private* + 28 base64 = 36 chars, no whitespace/quotes/non-ascii, not swapped, same-account endpoint host ik.imagekit.io, id length 9, trailing slash, folder "tiween"). ImageKit management API `GET /v1/files?limit=1` with the configured private key returns HTTP 403 `{"message":"Your account cannot be authenticated."}`; the upload endpoint returns HTTP 403 with an EMPTY body (so the provider's rejected object has no `message` at all). Plain `fetch` (no SDK/axios) gives the same 403, so SDK/provider are not at fault. No-auth request gives 401 "does not contain private API key".
  implication: the rejection is ImageKit refusing the credential, not a code/config-shape bug.

- timestamp: 2026-10-23
  checked: differential: 5 random well-formed private keys, the real key with one char changed (positions 8, 20, 34), the real key without prefix, vs the real key
  found: all variants return the identical 403 body, BUT only the exact configured key gets an `x-ik-requestid` response header (true on every call, repeated); every mutated/random key lacks it.
  implication: ImageKit recognises the configured key as a real key (a typo or truncation would behave like the mutants) yet refuses to authenticate its account. Remaining causes are account/key state on the ImageKit side: account disabled/suspended, key expired/deactivated/rotated, or upload/storage limit state. Not fixable from the repo; needs the owner to check the ImageKit dashboard (Developer options -> API keys, and account status).

- timestamp: 2026-10-23
  checked: @strapi/upload 5.51.2 `services/upload.js` uploadImage()
  found: `uploadPromises.push(provider.upload(fileData))` is created FIRST, then the code awaits `isResizableImage`, `generateThumbnail` (pushes a thumbnail upload promise), `generateResponsiveFormats` (sharp work), and only then `await Promise.all(uploadPromises)`. A provider rejection that lands during those awaits is an orphaned rejection (no handler yet) -> Node 22 `unhandledRejection` -> process crash. Strapi registers no unhandledRejection handler (grep of @strapi/strapi and @strapi/core dist found none). 45 failed-upload lines = 9 films x 5 uploads (main + thumbnail + 3 responsive formats of a 1280x720 maxresdefault), consistent with a timing race lost on film 9 (ImageKit 403 round trip vs sharp format generation).
  implication: defect 2 is a race between a fast-rejecting provider and Strapi's slow-to-attach Promise.all. try/catch in the importer cannot catch an orphaned rejection.

- timestamp: 2026-10-23
  checked: Strapi `destroy()` (node_modules/@strapi/core/dist/Strapi.js) and an end-to-end CLI run
  found: `strapi.destroy()` calls `process.removeAllListeners()` and deletes `global.strapi`. Stragglers of the last failed film (uploads that had already lost the Promise.all race) answer after shutdown; the ImageKit provider's catch handler calls `strapi.log.error` -> ReferenceError "strapi is not defined" -> with no listener left the process dies with a stack trace after the report was printed.
  implication: the CLI must re-arm a rejection handler after destroy(); done in seeds/shorts.ts.

- timestamp: 2026-10-23
  checked: fixed code, real-process runs (throwaway sqlite, no dev Postgres, scratchpad repro-import.ts)
  found: ORIGINAL code + fake provider rejecting at 5ms -> process dies: UnhandledPromiseRejection ... reason "#<Object>" ERR_UNHANDLED_REJECTION, exit 1 (same signature as the film-9 crash). FIXED code, same input -> both films in report.failed with "UPLOAD_FAILED: <slug>-backdrop (HTTP 403, ...)", process survives, duplicate rejections recorded as UNOBSERVED_REJECTION warnings.
  implication: defect 2 root cause and fix confirmed with real Node semantics.

- timestamp: 2026-10-23
  checked: full `seed:shorts --verify` CLI against the REAL ImageKit config on a throwaway sqlite DB, run twice
  found: no crash either time; 12 of 13 films in `failed` with "UPLOAD_FAILED: <slug>-backdrop (HTTP 403, check the upload provider credentials and account status)"; the 13th (les-souliers-de-laid, artify.tn link, no thumbnail source) is created posterless as before (NO_SOURCE warning, no upload attempted); exit code 1; no key-shaped string in the output; late post-shutdown rejection logged once ("strapi is not defined") instead of a crash trace.
  implication: end-to-end behaviour matches the owner's expectation for defect 2.

- timestamp: 2026-10-23
  checked: ImageKit account via the imagekit-admin MCP (OAuth, independent of the repo key) + public delivery probes
  found: account authenticates and is active. Usage 2026-08-01..10-23 = ~110 MB bandwidth, ~102 MB media-library storage, 0 video/extension units (far below any plan limit). URL endpoints: default (web-proxy origin), `tiween` -> TMDB web-folder origin, `octopus`, `emtb`. The repo's endpoint id `bc2xslzyt` belongs to this account: `ik.imagekit.io/bc2xslzyt/tiween/t/p/w92/<tmdb poster>` returns 200 image/jpeg via the `tiween` endpoint's TMDB origin.
  implication: "account disabled/suspended/over limit" is eliminated. The configured private key is recognised but refused, so it is a deactivated/rotated key (or one from a different account than bc2xslzyt). Fix is a fresh private key from Developer options -> API keys; the admin MCP has no key-management tool, so this stays an owner action.
  side_risk: the provider uploads into Media Library folder `tiween`, and the account has a URL endpoint with prefix `tiween` whose origin is TMDB. Uploaded files would get URLs `.../bc2xslzyt/tiween/<file>` that route through that endpoint; verify after the first successful upload that such URLs serve the uploaded file and not a TMDB 404 (if not, rename the upload folder or the endpoint prefix).

- timestamp: 2026-10-24
  checked: endpoint `tiween` (t1CG8mnt9) prefix renamed to `tmdb`, then reverted to `tiween` on owner direction
  found: the `/tiween/` TMDB proxy works again (200; `/tmdb/` gives 404). The account's 3-custom-endpoint limit blocks adding a separate one. Owner decision: TMDB assets are copied into Media Library folder `tiween/tmdb/` (todo 2026-10-24-copy-tmdb-images-into-imagekit-tiween-tmdb-folder) and uploads mirror the Media Library tree under `tiween/<env>/` (quick task 261024-iy3).
  implication: the side_risk above (an upload under `/tiween/` routed through a TMDB-origin endpoint) still has to be checked after the key is rotated.

## Eliminated

- hypothesis: ImageKit account disabled, suspended or over a plan limit
  evidence: admin MCP authenticates against the same account (endpoint id bc2xslzyt confirmed by delivery probe); usage ~110 MB bandwidth / ~102 MB storage; delivery through the account's endpoints returns 200
  timestamp: 2026-10-23

- hypothesis: ImageKit key typo, truncation, stray whitespace/quote, swapped public/private key, wrong key prefix
  evidence: shape checks (35/36 chars, correct prefixes, base64 body, no whitespace/quotes/non-ascii, not equal, not swapped); the exact key gets x-ik-requestid while 8 mutated/random keys never do
  timestamp: 2026-10-23
- hypothesis: SDK, provider or axios mishandling (e.g. Basic auth encoding)
  evidence: plain fetch with hand-built Basic header returns the identical 403 body
  timestamp: 2026-10-23
- hypothesis: network / DNS / TLS problem
  evidence: ImageKit answered 403/401 with JSON bodies and request ids on every call; delivery host answers 404 Not Found
  timestamp: 2026-10-23
- hypothesis: wrong IMAGEKIT_URL_ENDPOINT
  evidence: endpoint is only used for URL building, not authentication; the 403 occurs on api.imagekit.io management calls that never use it. Endpoint shape is valid (https, ik.imagekit.io, 9-char id, trailing slash)
  timestamp: 2026-10-23
- hypothesis: importer crash happens only on film 9 because film 9 is special
  evidence: no film has a poster source; every film uploads a YouTube maxres image (5 uploads each; 45 = 9 x 5). Film 9 simply lost the timing race
  timestamp: 2026-10-23
- hypothesis: patching @strapi/upload's provider service (pre-observing the promise) is enough to stop the crash
  evidence: uploadThumbnail/uploadResponsiveFormat are async wrappers created inside Strapi's closure; their derived promises reject orphaned even if the provider-service promise is observed
  timestamp: 2026-10-23

## Resolution

root_cause: |
Defect 1 (every upload rejected): ImageKit answers HTTP 403 "Your account cannot be authenticated." to the configured private key (management API and upload endpoint, with the SDK and with plain fetch). The key is well-formed and ImageKit recognises it (only the exact key gets an x-ik-requestid header; random and one-character-mutated keys never do), so the cause is account or key state on the ImageKit side (account disabled/suspended, key deactivated or rotated, or an account limit), not anything in the repo. The upload endpoint's 403 has an empty body, so the provider's rejected object carries no message, which is why only "Unable to upload file." was ever visible.
Defect 2 (importer crash): @strapi/upload 5.51 `uploadImage()` starts the provider upload, then awaits thumbnail and responsive-format generation before attaching Promise.all. ImageKit's 403 returns faster than sharp can resize a 1280x720 image, so the rejection (and the thumbnail wrapper's) is unobserved for a moment; Node 22 turns that into a process crash that the importer's try/catch cannot intercept. Film 9 lost this timing race. Independently, the importer treated any media failure as a warning, so a provider that refuses files would have published every film without media.
fix: |
apps/strapi/scripts/seeds/utils/media-upload.ts: MediaUploadError + describeUploadFailure (allow-listed HTTP status/code/message, key-shaped text redacted, raw error never carried); findOrUploadImage wraps a refused upload in MediaUploadError; guardUnobservedRejections keeps the process alive and reports rejections nobody awaits.
apps/strapi/scripts/seeds/shorts/import-short-films.ts: backdrop/poster re-throw MediaUploadError so the film lands in report.failed (nothing written for it) while download failures stay warnings; the film loop runs under guardUnobservedRejections (deduplicated UNOBSERVED_REJECTION warnings); errorCode reports the full upload message.
apps/strapi/scripts/seeds/shorts.ts: re-arms a safe stray-rejection handler after strapi.destroy() (which removes every process listener) so late provider answers cannot crash the CLI or give a green exit code.
Defect 1 needs the owner: check the ImageKit dashboard (account status/billing, Developer options -> API keys), copy a fresh private key into apps/strapi/.env.
verification:
target_test: { result: pass, note: "new service test 'fails a film whose image the upload provider refuses...' and 23/23 service tests; 58/58 media-upload unit tests; full server unit gate 91 suites / 1578 tests" }
mutation_check: { result: skipped, reason_if_skipped: "no Stryker configured in apps/strapi", mutant_killed: "manual substitute: 4 hand-made mutants at the fix sites all killed (backdrop rethrow removed -> service test fails; poster rethrow removed -> service test fails; key redaction removed -> unit test fails; $ResponseMetadata status read removed -> 5 unit tests fail)" }
no_op_deletion: { result: pass, deletion_justified_by_rca: false, note: "diff adds behaviour only; the one removed construct is the single-line loop body moved under the guard" }
adjacent_tests: { result: pass, suites_run: ["scripts/seeds (4 suites, 169 tests)", "all server unit suites (91)", "import-short-films.service.test.ts on sqlite with ImageKit env blanked"] }
revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, note: "original importer + 5ms-rejecting fake provider -> process dies with UnhandledPromiseRejection; fixed -> films in failed, process survives; new service test red on original code, green on fix" }
guardrail_verdict: accepted
commit: 45c79c2 (main, not pushed)
oracle_type: specified (report contract: a film whose upload fails is listed in `failed` and the run completes) plus a real-process check for the crash
files_changed:

- apps/strapi/scripts/seeds/utils/media-upload.ts
- apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts
- apps/strapi/scripts/seeds/shorts/import-short-films.ts
- apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts
- apps/strapi/scripts/seeds/shorts.ts
