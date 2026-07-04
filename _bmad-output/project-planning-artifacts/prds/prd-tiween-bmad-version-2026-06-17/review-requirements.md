# Requirements-Gap Review — Tiween Social Content Studio

_Reviewer: inlined-PRD requirements analyst, 2026-06-17 (verified second pass)._

## Overall assessment

17 FRs cover the happy-path spine (import → generate → gate → schedule → publish/handoff) competently; Arabic gate well-specified. Several operationally critical launch-grade behaviors are absent — most importantly post-approval editing re-triggering the Arabic gate, review-ready notification, and whole-run failure handling — and a few consequences are untestable as written. **Image intake is NOT a gap** (Glossary defines Event w/ optional image; FR-1 imports it; FR-9 handles absence) — verified, not invented.

## Missing FRs (ranked)

- **M1 — Edit AFTER approval, BEFORE publish (CRITICAL).** No FR covers mutating an already-approved Post while it sits scheduled. FR-2 = before generation; FR-11 = before approval; nothing for the gap. An approver tweaking an approved Arabic caption that silently keeps its Approval = direct breach of "Arabic never auto-ships" (FR-10/§11). _Suggested FR-18: editing any field of an approved-but-unpublished Post invalidates its Approval and returns it to queue; if Arabic content changed, Arabic Approval is also revoked and re-required._
- **M2 — Whole-run/batch generation failure (HIGH).** FR-16 = per-(Post,Channel) publish failure only. Nothing for a generation-run failure (Placid down, n8n error, 8 of 25 events never generate). _Suggested FR-19: per-Event generation success/failure reported; partial failures flagged not silently missing; generation safely re-runnable without duplicating successes._
- **M3 — "Batch ready for review" notification (HIGH).** No FR notifies the team a batch is ready or that items await Arabic review. UJ-1/UJ-2 + "Karim out → waits" all imply it. Without it, "waits indefinitely" is indistinguishable from "nobody knew." _Suggested FR-20: when a batch enters the queue, and when Posts enter Arabic-pending, the relevant role(s) are notified._
- **M4 — Unpublish/pull-back a published Post (MEDIUM).** No FR to retract/delete after permalink recorded (wrong fact slips through, event cancelled — routine for events). _Suggested FR-21: published Post can be marked retracted w/ audit; deletion requested where node supports it, else manual-pull handoff (cf FR-17)._
- **M5 — Batch history/archive (MEDIUM).** No FR for retention/lookup of prior batches; Auditability NFR needs them retrievable. _Suggested FR-22._
- **M6 — Overlapping/concurrent batches (LOW-MED).** FR-1 dedup key scoped "within Batch" → same event across two overlapping batches won't dedup, could double-publish. _Suggested FR-23: define concurrent-batch behavior + cross-batch dedup/scheduling._

## Vague / untestable consequences

- **FR-8 "visual QA"** — no automatable pass/fail; conflicts with "observable" NFR. Needs reference-image diff / approved glyph set / recorded manual sign-off.
- **FR-9 image intake (minor)** — how the image arrives (URL in file? upload?) underspecified for a "structured file" import.
- **FR-5 "trailing LTR lines"** — placement not pinned to a verifiable per-platform rule (borderline).
- **FR-3 string-equality for price/date/time** — likely false-positive "fact mismatch" once localized (see C1).

## Contradictions

- **C1 — FR-3 string-equality vs FR-4/FR-8 multilingual rendering (IMPORTANT).** "Exactly as supplied (string-equality)" for date/time/price collides with native AR/FR/EN drafting + Arabic RTL/digit rendering — the rendered string won't be byte-equal to the supplied Latin string. As written, FR-3 would block legitimately localized Posts on day one. Fix: normalize-then-compare, or compare semantic facts not raw strings.
- **C2 — FR-15 "±5min window" vs FR-16 retry / FR-17 handoff.** Retry and human-paced handoff can't honor a ±5min SLA. Qualify the window as "successful automated publishes only."
- **C3 — "Arabic never auto-ships" vs missing M1 rule.** The strongest invariant has no FR protecting it on the edit path.

## UJ coverage

- UJ-1: import/generate/queue/roundup covered; **"gets a batch" notification beat → M3.**
- UJ-2: RTL preview, AR+siblings, fix register, venue-name correction (FR-3/6), approve, Karim-out-waits all ✓; **notification of waiting items → M3**; venue correction after others approved → **M1**.
- UJ-3: publish/permalink/alert/handoff all ✓; **"across the week" → overlapping-batch (M6)**; no unpublish beat but M4 still a launch omission.

## Top priorities before launch

**M1** (post-approval edit re-gates Arabic), **C1** (string-equality vs localization — blocks real Posts day one), **M2** (whole-run failure), **M3** (review notification).
