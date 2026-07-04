---
title: "Tiween Social Content Studio"
status: final
created: 2026-06-17
updated: 2026-06-17
---

# PRD: Tiween Social Content Studio

_Working title — confirm. Status: final (first cycle); 21 FRs, reviewer-gated, 6 blocking open questions remain for resolution before/at build start (§8)._

## 0. Document Purpose

This PRD is for the Tiween product owner (Ayoub), the marketing team who will operate the pipeline, and the downstream UX / architecture / epic workflows. It specifies an **automated weekly content-production pipeline** that turns a curated list of Tunisian cultural events into approved, brand-consistent social-media content across Instagram, Facebook, TikTok, and X. It is structured Glossary-first: features are grouped with Functional Requirements (FR) nested under them, assumptions are tagged inline (`[ASSUMPTION: ...]`) and indexed in §9. Technical mechanism (orchestration, rendering, publishing, approval surface, model choice) is deliberately kept out of the PRD body and lives in `addendum.md` — this document specifies _capabilities_, not vendors. **A standing project constraint shapes those mechanism choices: assemble from existing low-code/SaaS building blocks (n8n as the orchestration spine) rather than building a custom application** (§11). This is a new scope, distinct from the Tiween ticketing platform epics; it reuses the Tiween brand system but is otherwise standalone.

## 1. Vision

Tunisia has a dense, fragmented cultural calendar — concerts, theatre, film, exhibitions, festivals — scattered across venue pages, Facebook events, and word of mouth. Tiween wants to become **the weekly voice of Tunisian culture on social media**: the account people follow to know what's happening this week, in their language, beautifully presented. Today that means a person manually assembling posts every week — slow, inconsistent, and impossible to sustain across four platforms and three languages.

The Tiween Social Content Studio automates the **production** of that weekly content while keeping a human firmly in control of what ships. A marketer hands it the week's events and venues; the system drafts native multilingual captions (Arabic, French, English), renders branded event graphics and a weekly-roundup unit in Tiween's visual identity, and routes everything into a review queue. Nothing reaches the public until a human approves it — and the Arabic copy is never published without a native-speaker's sign-off. Once approved, content is scheduled and published to all target channels automatically.

The win is **reach and consistency at a fraction of the effort**: a small team produces a polished, on-brand, multilingual cultural agenda every week, growing Tiween's audience and establishing it as the definitive cultural voice — without the manual grind that makes weekly publishing collapse.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** Turn a weekly list of events into ready-to-publish, on-brand social content for four platforms and three languages — without designing or writing each post by hand.
- **Functional:** Review and approve content quickly, with confidence that event facts (date, venue, time) are correct and the Arabic reads naturally.
- **Social / brand:** Establish Tiween as _the_ authoritative, culturally-fluent voice of Tunisian events — consistent enough that the audience recognizes and trusts it.
- **Emotional:** Stop dreading the weekly content scramble; trust that the pipeline will not embarrass the brand with a wrong date or awkward machine-Arabic.
- **Contextual:** Operate as a small team — one person curating and drafting, another approving — without stepping on each other or losing track of what's been published where.

### 2.2 Non-Users (v1)

- **Event organizers / venues** — they do not interact with the Studio directly; they are the _subjects_ of content, not operators. (A future self-serve "submit your event" path is out of scope — see §5.)
- **End consumers / the audience** — they see the _output_ on social platforms; they never touch the Studio.
- **Tiween ticketing-platform users** — this is a marketing tool, not part of the consumer ticketing product.

### 2.3 Key User Journeys

- **UJ-1. Leïla turns Monday's event list into a week of content.**

  > Leïla, Tiween's content lead, starts her week with a list of ~25 cultural events happening across Tunis, Sousse, and Sfax — pulled from venue pages and partner submissions into a spreadsheet. She opens the Studio, imports the list, and triggers generation. The system drafts three caption variants per event in Arabic, French, and English, renders a branded graphic for each, and assembles a weekly-roundup carousel. A few minutes later she has a full batch sitting in the review queue, each item showing its graphic preview and caption variants side by side. **Climax:** what was a two-day manual slog is now a queue she can review in an afternoon. **Resolution:** she moves through the queue picking the best caption variant and tweaking copy. **Edge case:** one event has no good photo — the system falls back to a category-colored template graphic, flagged so she knows it's a fallback.

- **UJ-2. Karim signs off on the Arabic before anything ships.**

  > Karim, a native Tunisian-Arabic speaker on the team, gets the batch after Leïla's first pass. The queue shows him only items whose Arabic caption still needs review. For each, he sees the rendered graphic (Arabic text shaped correctly, right-to-left) and the Arabic caption with its French/English siblings for context. He fixes register where the draft drifted too formal, corrects a venue name the model "translated," and approves. **Climax:** the Arabic track is guaranteed human-checked — the brand never ships awkward machine-Arabic. **Resolution:** approved items move to _scheduled_; rejected ones bounce back to Leïla with his note. **Edge case:** if Karim is out, no Arabic content auto-publishes — it waits, rather than shipping unreviewed.

- **UJ-3. The week's content publishes itself on schedule.**

  > Once a batch is approved and scheduled, Leïla doesn't touch it again. The system publishes each piece to its target channels — Instagram, Facebook, and (where platform access is cleared) TikTok and X — at the scheduled times across the week. **Climax:** the cultural agenda goes out reliably without anyone hovering over a publish button. **Resolution:** each published piece records where it went and links back to the live post; failures surface as an alert, not a silent gap. **Edge case:** if a channel rejects a post (e.g. TikTok not yet audited for direct posting), it drops to a "needs manual posting" state with the asset ready to hand off — it never silently disappears.

## 3. Glossary

- **Studio** — the Tiween Social Content Studio: the end-to-end pipeline described by this PRD.
- **Event** — a single Tunisian cultural happening (concert, play, screening, exhibition, festival date) with fixed factual attributes: title, date, time, **Venue**, category, and optional price/lineup/image. Supplied via the **Weekly List**.
- **Venue** — the physical place hosting an **Event** (name, city). An **Event** has exactly one **Venue**.
- **Weekly List** — the curated input for one cycle: a set of **Events** + **Venues** provided by the operator (spreadsheet/import/manual entry). One **Weekly List** produces one **Batch**.
- **Batch** — all generated content for one **Weekly List**, moving through the pipeline together.
- **Post** — one unit of generated content targeting one or more **Channels**: a graphic (or carousel) plus a **Caption** per language. Each per-**Event** post and the **Roundup** are **Posts**.
- **Roundup** — the single aggregated "this week in Tunisian culture" content unit (carousel or recap graphic + digest caption) summarizing the **Batch**. A first-class **Post**, distinct from per-**Event** posts.
- **Caption** — the written copy for a **Post** in one language (AR/FR/EN), including hashtags. Each language is drafted natively.
- **Graphic** — the rendered branded visual for a **Post**, in Tiween's visual identity, at channel-appropriate dimensions.
- **Channel** — a target social platform: Instagram, Facebook, TikTok, or X.
- **Review Queue** — the human-approval surface where **Posts** are previewed, edited, approved, or rejected before publishing.
- **Approval** — a human action transitioning a **Post** from review to publishable. **Arabic Approval** is a distinct gate requiring a native-Arabic reviewer.
- **Operator** — a member of the marketing team using the **Studio** (roles: curator/drafter, approver, Arabic reviewer).
- **Brand System** — Tiween's visual + verbal identity (Gold Leaf × Aubergine palette, taa logo, category color-coding, voice) that all **Graphics** and **Captions** must conform to.

## 4. Features

_FR IDs are stable and append-only: FR-18–FR-21 were added during review and placed with the feature they belong to, so the numbering is not strictly sequential top-to-bottom. Every ID FR-1…FR-21 is unique; downstream artifacts should reference FRs by ID, not by position._

### 4.1 Weekly List Intake

**Description:** The **Operator** provides the week's **Events** and **Venues** as a **Weekly List**, the single source of factual truth for the **Batch**. Intake accepts a structured import (spreadsheet/CSV) and supports manual add/edit of individual **Events**. The system validates required factual fields before any generation runs, because every downstream **Caption** and **Graphic** depends on these facts being correct. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Import a Weekly List

The **Operator** can import a **Weekly List** of 15–40 **Events** (each with its **Venue**) from a structured file. Realizes UJ-1.

**Consequences (testable):**

- A valid import of N events produces N **Event** records plus their **Venue** associations in one **Batch**.
- Rows missing a required field (title, date, time, venue) are rejected with a per-row error identifying the field; valid rows still import.
- Import is idempotent within a **Batch**: re-importing the same list does not duplicate **Events** (matched on a stable key). `[ASSUMPTION: dedup key is title + date + venue.]`

#### FR-2: Manually add or edit an Event

The **Operator** can add, edit, or remove individual **Events** in a **Weekly List** before generation.

**Consequences (testable):**

- Editing a factual field (date/time/venue) on an **Event** that already has generated content flags that content as stale and requiring regeneration.
- Required fields are validated on save; an **Event** cannot enter generation with a missing required field.

#### FR-3: Validate event facts as ground truth

The system treats **Weekly List** fields as immutable ground truth: the _meaning_ of factual fields is never altered by generation. Validation compares the **semantic fact** (the same calendar date, time, **Venue**, and price), not byte-identical strings — so a correctly localized rendering (Arabic RTL date order, locale-specific digits or date format) passes, while a changed or invented fact fails.

**Consequences (testable):**

- Date, time, **Venue** name, and price in every generated **Caption** and **Graphic** must resolve — after locale normalization (digit system, date format, RTL ordering) — to the exact values supplied in the **Weekly List**, or the **Post** is blocked from the **Review Queue** with a "fact mismatch" error. `[ASSUMPTION: a normalization spec (date/number/RTL canonicalization per locale) is defined at the architecture phase; the PRD requires semantic equality, not byte equality.]`
- Proper nouns (venue, artist, event title) are not transliterated or "translated" in any language variant (compared verbatim — these are not localized).

**Out of Scope:**

- Sourcing or scraping events automatically — the **Weekly List** is curated by a human (see §5).

### 4.2 Multilingual Caption Generation

**Description:** For each **Event** and for the **Roundup**, the system drafts a **Caption** natively in Arabic, French, and English — not by translating a single master. Each language has its own brand-voice guidance so the Arabic reads as natural Tunisian-audience copy rather than stiff machine-Arabic, which is the single biggest quality risk and Tiween's biggest differentiator. The system produces multiple variants per language so the **Operator** chooses rather than rewrites. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-4: Generate native captions per language

The system generates a **Caption** in AR, FR, and EN for each **Post**, each drafted natively from the **Event** facts and brand voice. Realizes UJ-1.

**Consequences (testable):**

- Every per-**Event** **Post** has a non-empty AR, FR, and EN caption before entering the **Review Queue**.
- Captions are generated independently per language (not a translation chain): the AR caption is produced from the structured facts + AR voice guidance, not from the EN/FR text.
- Each language returns 2–3 selectable variants. `[ASSUMPTION: 3 variants per language.]`

#### FR-5: Apply per-platform caption formatting

The system formats each **Caption** to the target **Channel**'s conventions deterministically (length limits, hashtag count/placement, mention style), including correct bidirectional handling for mixed Arabic/Latin text.

**Consequences (testable):**

- A caption exceeding a **Channel**'s character limit is flagged before publish, never silently truncated mid-word.
- In Arabic captions, hashtags and @mentions render on their own trailing lines (LTR) so the mixed-script layout reads correctly.
- Hashtag count per platform stays within that platform's recommended maximum. `[ASSUMPTION: platform hashtag/length rules are configurable constants, not hardcoded.]`

#### FR-6: Lock proper nouns and brand terms

The system preserves a glossary of proper nouns (venues, artists, event titles) and Tiween brand terms verbatim across all language variants.

**Consequences (testable):**

- A venue/artist name from the **Weekly List** appears unchanged in all three language captions.
- Tiween brand terms are never auto-translated.

**Feature-specific NFRs:**

- Arabic captions must never auto-publish without **Arabic Approval** (see FR-10). This is a hard gate, not a preference.

### 4.3 Branded Graphic Rendering

**Description:** The system renders a branded **Graphic** for each **Post** in Tiween's **Brand System** — correct palette, logo, category color-coding, and channel-appropriate dimensions — with Arabic text shaped and laid out right-to-left correctly. Event facts are rendered as fixed template fields, not generated text, so the visual cannot show a wrong date. Realizes UJ-1.

**Functional Requirements:**

#### FR-7: Render a per-Event Graphic

The system renders a branded **Graphic** per **Event** at the dimensions each target **Channel** requires (feed, portrait, story). Realizes UJ-1.

**Consequences (testable):**

- Each per-**Event** **Post** has at least one rendered **Graphic** at the correct dimensions before entering the **Review Queue**.
- The **Graphic** displays the **Event**'s factual fields exactly as supplied (date/time/venue), rendered from template variables.
- Category color-coding from the **Brand System** is applied deterministically by the **Event**'s category.

#### FR-8: Render Arabic text correctly in Graphics

Arabic text in any **Graphic** is shaped, ligatured, and laid out right-to-left correctly with a brand-approved Arabic font.

**Consequences (testable):**

- A fixed Tunisian-Arabic test string renders with zero missing-glyph (`.notdef` / tofu) boxes and matches an approved golden-reference image within a small pixel-diff tolerance; this golden-image check is the acceptance gate for the graphics engine (the §13 render-test go/no-go), not a subjective eyeball pass.
- Text that overflows its container is auto-fit or truncated by an explicit, stated rule (e.g. shrink-to-fit down to a minimum size, then ellipsis), never clipped arbitrarily. `[ASSUMPTION: the exact overflow rule is set with the template design; the PRD requires that one explicit deterministic rule exists.]`

#### FR-9: Fallback Graphic when no image is available

When an **Event** has no usable image, the system renders a category-colored template **Graphic** and flags it as a fallback.

**Consequences (testable):**

- An **Event** with no image still produces a valid branded **Graphic**.
- Fallback **Graphics** are visibly flagged in the **Review Queue** so the **Operator** knows.

#### FR-19: Resilient generation with per-Event failure visibility

Generation reports success or failure per **Event**; a failure of one **Event**'s caption or graphic does not abort the **Batch**, and the failed work is safely re-runnable without duplicating what succeeded. Realizes UJ-1.

**Consequences (testable):**

- When generation fails for some **Events** (e.g. the graphics or caption service errors), the **Batch** still forms with the successful **Posts**; failed **Events** are visibly flagged as "generation failed," never silently dropped.
- An **Operator** (or the **Studio** automatically) can re-run generation for only the failed **Events**; re-running does not duplicate or regenerate already-successful **Posts**.
- A **Batch** in which every **Event** failed to generate surfaces as a failed run with a reason, not an empty success.

### 4.4 Review & Approval Queue

**Description:** Every **Post** lands in the **Review Queue** before it can be published. The **Operator** previews the rendered **Graphic** and **Caption** variants per language, edits copy, selects the variant, and approves or rejects. Roles are distinguished: a general approver handles overall sign-off, and a native-Arabic reviewer holds a dedicated **Arabic Approval** gate. Nothing publishes without human approval; Arabic never publishes without Arabic Approval. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-10: Human approval gate (with distinct Arabic gate)

A **Post** cannot be scheduled or published until a human approves it; its Arabic content additionally requires **Arabic Approval** by a native-Arabic reviewer. Realizes UJ-2.

**Consequences (testable):**

- No **Post** transitions to _scheduled_ without a recorded human **Approval**.
- A **Post** with Arabic content cannot reach _scheduled_ without a recorded **Arabic Approval** distinct from general approval.
- If no Arabic reviewer acts, the Arabic content waits indefinitely rather than publishing. Realizes UJ-2 edge case.

#### FR-11: Preview, edit, and select variants

The **Operator** can preview the **Graphic** and all language **Caption** variants for a **Post**, edit any caption, and select the variant to publish per language.

**Consequences (testable):**

- The preview shows the rendered **Graphic** and AR/FR/EN captions together, with Arabic displayed in correct bidi layout.
- An edited caption is re-validated against fact-preservation (FR-3) before approval is allowed.
- Exactly one variant per language is marked for publishing per **Post**.

#### FR-12: Reject with feedback / routing

The **Operator** can reject a **Post** (or its Arabic track) back to the curator with a note.

**Consequences (testable):**

- A rejected **Post** leaves the publishable set and returns to an editable state with the reviewer's note attached.
- Rejecting only the Arabic track does not block the FR/EN tracks from proceeding. `[ASSUMPTION: language tracks can be approved independently.]`

#### FR-13: Role-based queue

The **Review Queue** distinguishes **Operator** roles (curator/drafter, approver, Arabic reviewer) and can filter to the work each role owns.

**Consequences (testable):**

- The Arabic reviewer can filter the queue to **Posts** awaiting **Arabic Approval**.
- An **Operator** without approver rights cannot record an **Approval**.

#### FR-18: Editing an approved Post re-opens its gates

Editing any content of a **Post** that is already approved but not yet published invalidates its **Approval** and returns it to the **Review Queue**; if Arabic content changed, **Arabic Approval** is also revoked and re-required. Realizes UJ-2.

**Consequences (testable):**

- After an edit to an approved-but-unpublished **Post**, that **Post** is no longer schedulable until it is re-approved (FR-10).
- If the edit touched the Arabic **Caption** (or its selected variant), the **Post** cannot reach _scheduled_ without a fresh **Arabic Approval** — an edited Arabic caption can never inherit the prior gate's sign-off. (Closes the bypass of the "Arabic never auto-ships" guarantee, §11.)
- The prior approval and the re-approval are both recorded in the audit trail (§10).

### 4.5 Weekly Roundup Assembly

**Description:** Beyond per-**Event** posts, the system assembles a first-class **Roundup** — the packaged "this week in Tunisian culture" unit (carousel or recap graphic + digest caption) that aggregates the **Batch**. It is generated _after_ per-**Event** content is approved so it reuses confirmed facts, and it has its own template and caption guidance distinct from single-event posts. Realizes UJ-1.

**Functional Requirements:**

#### FR-14: Assemble the weekly Roundup

The system produces one **Roundup** per **Batch** aggregating the week's **Events**, with its own **Graphic**(s) and multilingual **Caption**.

**Consequences (testable):**

- One **Roundup** **Post** is generated per **Batch**.
- The **Roundup** reuses **Event** facts already confirmed in the **Batch** (no re-derivation of dates/venues).
- The **Roundup** flows through the same **Review Queue** and approval gates as any other **Post**.

**Notes:**

- `[NOTE FOR PM]` Roundup format (single recap graphic vs. multi-slide carousel) likely varies per **Channel** — confirm whether one format serves all four or each needs its own.

### 4.6 Scheduling & Multi-Channel Publishing

**Description:** Approved **Posts** are scheduled and published automatically to their target **Channels** — Instagram, Facebook, TikTok, and X — across the week. Publishing is reliable and idempotent: every publish is recorded with a link to the live post, failures alert the team rather than disappearing, and a **Channel** that cannot accept a direct post (e.g. TikTok before platform audit clears) drops the asset to a "needs manual posting" handoff. Realizes UJ-3.

**Functional Requirements:**

#### FR-15: Schedule approved Posts

The **Operator** can schedule an approved **Post** for publication at a chosen time per **Channel**. Realizes UJ-3.

**Consequences (testable):**

- Only approved **Posts** (per FR-10) can be scheduled.
- A scheduled **Post** that publishes successfully on the first automated attempt does so within an acceptable window of its scheduled time. `[ASSUMPTION: ±5 minutes is acceptable.]` (The window applies to first-attempt automated publishes only; retries per FR-16 and manual-handoff per FR-17 are human/recovery-paced and not bound by it.)

#### FR-16: Auto-publish to target Channels

The system publishes a scheduled **Post** to each of its target **Channels** automatically, recording the result. Realizes UJ-3.

**Consequences (testable):**

- A successful publish records the live post's permalink and marks the **Post** _published_ for that **Channel**.
- Publishing is idempotent per (**Post**, **Channel**): a retry never creates a duplicate live post.
- A publish failure marks that **Channel**'s attempt _failed_ and raises an alert; it is never silently dropped. Realizes UJ-3 edge case.

#### FR-17: Manual-handoff fallback for gated Channels

When a **Channel** cannot accept a direct automated post, the system drops the finished asset to a "needs manual posting" state with everything an **Operator** needs to post by hand.

**Consequences (testable):**

- A **Post** targeting a not-yet-enabled **Channel** lands in _needs manual posting_ with its **Graphic** and selected **Caption** downloadable/copyable.
- Such **Posts** are visible as outstanding work, not marked _published_.

#### FR-20: Notify the team at review and Arabic-pending milestones

The **Studio** notifies the relevant **Operator** role(s) when a **Batch** is ready for review and when **Posts** are awaiting **Arabic Approval**. Realizes UJ-1, UJ-2.

**Consequences (testable):**

- When a **Batch** finishes generation and enters the **Review Queue**, the team is notified with a link to the queue and a count of items. `[ASSUMPTION: notification channel is the team's existing channel, e.g. email/Slack — confirmed at architecture.]`
- When **Posts** enter the Arabic-pending state, the **Arabic reviewer** role is notified, so the "Arabic waits indefinitely" branch (FR-10) reflects a deliberate hold, not an unnoticed one.

#### FR-21: Retract or pull back a published Post

An **Operator** can mark a published **Post** as retracted (e.g. the **Event** was cancelled or a fact slipped through); where the **Channel**'s integration supports deletion the **Studio** requests it, otherwise it routes the retraction to a manual pull-down handoff. Realizes UJ-3.

**Consequences (testable):**

- A retracted **Post** is recorded as retracted (with reason + actor) in the audit trail and no longer counts toward publishing-consistency metrics.
- For a **Channel** that supports programmatic deletion, the **Studio** attempts deletion and records the result; for one that does not, the **Post** lands in a "needs manual pull-down" state (analogous to FR-17) rather than being silently left live.

**Feature-specific NFRs:**

- Per-**Channel** publishing enablement is independent: launching with IG+FB live and TikTok/X in handoff mode must be a configuration state, not a code change. (See §13 Risk — platform audits.)

## 5. Non-Goals (Explicit)

- **Not an event-discovery / aggregation engine.** The Studio does not crawl, scrape, or source events; a human curates the **Weekly List**. `[NON-GOAL for MVP]`
- **Not a self-serve portal for venues/organizers** to submit their own events.
- **Not a social analytics / listening product.** It publishes; it does not deeply analyze comments, sentiment, or competitor activity (basic publish-confirmation metrics aside).
- **Not a community-management tool.** Replying to comments/DMs is out of scope.
- **Not a replacement for human editorial judgment.** Auto-publish is always _post-approval_; the Studio never decides _what_ is worth posting.
- **Not part of the Tiween ticketing platform.** It is a marketing/growth tool that reuses the brand and (optionally) backend, nothing more.
- **Not a paid-ads manager.** Organic content only; no ad-spend, targeting, or boosting.

## 6. MVP Scope

### 6.1 In Scope

- **Weekly List** intake (import + manual edit) for 15–40 **Events**.
- Native multilingual **Caption** generation (AR/FR/EN) with variants and per-platform formatting.
- Branded **Graphic** rendering with correct Arabic RTL shaping and a fallback template.
- **Review Queue** with human approval and a distinct **Arabic Approval** gate, role-aware, for a small team.
- **Weekly Roundup** assembly.
- Scheduling and auto-publish to four **Channels** — **with per-channel enablement**, so a **Channel** whose platform access isn't cleared runs in manual-handoff mode.
- Idempotent publishing with permalink recording and failure alerting.

### 6.2 Out of Scope for MVP

- Automatic event sourcing/scraping — deferred indefinitely (deliberate **Non-Goal**, §5).
- Self-serve organizer submissions — v2+.
- Short-form **video / Reels** generation — v2. `[NOTE FOR PM] TikTok is video-first; image/carousel "photo mode" support varies by region — the broad-4-channel goal may push video up the roadmap. Emotionally load-bearing: flag for revisit.`
- Analytics dashboards beyond publish confirmation — v2.
- Comment/DM management — out.
- A/B testing of caption variants at publish time (variants exist for _human_ choice in MVP, not automated experimentation) — v2.

## 7. Success Metrics

**Primary**

- **SM-1: Audience growth.** Net follower growth across the four **Channels**, measured weekly. Target: sustained week-over-week growth once the Studio is live. Validates the brand-building purpose behind FR-4, FR-7, FR-14, FR-16.
- **SM-2: Publishing consistency.** % of weeks with a complete published cultural agenda (per-event posts + **Roundup**) across enabled **Channels**. Target: ≥95% of weeks complete. Validates FR-15, FR-16.

**Secondary**

- **SM-3: Engagement rate.** Average engagement (likes/saves/shares/comments) per **Post**, tracked by **Channel** and language. Validates FR-4, FR-5, FR-7.
- **SM-4: Time-to-publish.** Operator hours from **Weekly List** import to a fully scheduled **Batch**. Target: a small team completes a 15–40-event week in well under a prior full manual cycle. Validates FR-1, FR-4, FR-7, FR-11.
- **SM-5: Approval throughput / rework rate.** % of generated **Posts** approved without a fact-correction edit. A proxy for generation quality. Validates FR-3, FR-4.

**Counter-metrics (do not optimize)**

- **SM-C1: Volume for its own sake.** Do not maximize number of **Posts** — flooding channels with low-quality content erodes the brand. Counterbalances SM-1/SM-2. The goal is a _curated_ weekly agenda, not maximum throughput.
- **SM-C2: Approval speed at the cost of Arabic quality.** Do not optimize **Arabic Approval** turnaround such that reviewers rubber-stamp. Counterbalances SM-4. A slow, careful Arabic gate is correct.
- **SM-C3: Engagement-bait.** Do not chase SM-3 with clickbait or sensational copy that betrays Tiween's cultural-authority voice. Counterbalances SM-3.

## 8. Open Questions

_Each tagged **[blocking]** (must resolve before/at build start) or **[non-blocking]** (can resolve during build / post-launch)._

1. **[blocking]** Does auto-publish go live for **all four channels at launch**, or do IG+FB launch live while TikTok/X start in manual-handoff mode pending platform audits? (User stated broad/all-four intent; research flags TikTok audit + X API access as real gates — see §13.)
2. **[non-blocking]** ~~Strapi vs. standalone for the Review Queue~~ — **resolved:** the queue lives in **Airtable + n8n** per the no-code build constraint (§11, §14). Remaining sub-question: confirm Airtable specifically vs. another grid (Notion).
3. **[blocking]** What is the source of the **Weekly List** in practice — a shared spreadsheet, a form, partner feeds? Determines the import format for FR-1.
4. **[non-blocking]** Roundup format per **Channel** — one universal format or per-channel (FR-14 note)?
5. **[blocking]** Caption register strategy per platform (derja/Arabizi for TikTok/IG vs. MSA/French for FB) — confirm so AR voice guidance can be authored.
6. **[blocking]** Is short-form video genuinely deferred to v2, given TikTok is video-first and is a launch channel?
7. **[non-blocking]** Who are the named operators and which roles do they hold (approver vs. Arabic reviewer)?
8. **[blocking]** Which SaaS template engine for graphics — **Placid vs. Bannerbear** — pending the Arabic-shaping render test (§13)?
9. **[non-blocking]** (Deferred from review) Success-metric numeric targets/baselines for SM-1, SM-3, SM-4 — capture the current manual baseline and set thresholds after the first weeks of operation.
10. **[non-blocking]** (Deferred from review) Concurrent/overlapping-**Batch** behavior and cross-batch dedup (FR-1's dedup key is scoped within one **Batch**) — define when next week's list is imported before this week finishes publishing.

## 9. Assumptions Index

- §4.1 FR-1 — **Weekly List** dedup key is title + date + venue.
- §4.1 FR-3 — a locale normalization spec (date/number/RTL canonicalization) is defined at the architecture phase; the PRD requires semantic, not byte, equality of facts.
- §4.3 FR-8 — the exact text-overflow rule is set with the template design; the PRD requires one explicit deterministic rule exists.
- §4.6 FR-20 — notification channel is the team's existing channel (email/Slack), confirmed at architecture.
- §4.2 FR-4 — 3 caption variants per language.
- §4.2 FR-5 — platform hashtag/length rules are configurable constants, not hardcoded.
- §4.4 FR-12 — language tracks (AR vs FR/EN) can be approved/rejected independently.
- §4.6 FR-15 — ±5 minutes is an acceptable scheduling window.
- §6 Out of Scope — short-form video is deferred to v2 (tension with TikTok being a launch channel — see Q6).
- §2.1 / general — captions are multilingual with AR + FR as primary for the Tunisian audience, EN secondary.
- General — **Graphics** carry the current Tiween **Brand System** (Gold Leaf × Aubergine, taa logo, category color-coding).
- §14 — the **Review Queue** is implemented in **Airtable** (recommended fit; confirm vs. Notion).
- §14 — graphics are produced via a **SaaS template API (Placid or Bannerbear)**, conditional on passing an Arabic-shaping render test.
- §14 — publishing uses **n8n direct platform nodes** (no publishing aggregator).

---

## 10. Cross-Cutting NFRs

- **Multilingual correctness.** Arabic (RTL, shaping), French, and English are first-class everywhere — captions, graphics, and the review UI. Mixed-script (Arabic + Latin) must render with correct bidirectional layout.
- **Reliability of publishing.** Publishing is idempotent (no duplicate live posts on retry) and observable (every attempt recorded; every failure alerts). No silent failures, ever.
- **Throughput.** A single **Batch** of 15–40 **Events** generates captions + graphics + roundup within a single operator working session (minutes, not hours of waiting).
- **Auditability.** Every **Post** carries a record of who approved it, when, which variant shipped, and where it published (permalink). Especially the **Arabic Approval** chain.
- **Assembled from configurable services.** The pipeline is composed from existing low-code/SaaS building blocks orchestrated by n8n (§11, §14), not a custom-built application. Per-channel enablement, hashtag/length rules, and scheduling windows are configuration/workflow settings, not code deploys. Each external building block sits behind a swappable boundary so any one (graphics vendor, publish method, approval surface) can be replaced without re-architecting the pipeline.
- **Brand consistency.** All output conforms to the **Brand System** by construction; off-brand output should be hard to produce, not merely discouraged.

## 11. Constraints and Guardrails

### Build approach (project constraint)

- **Assemble over build.** Favor existing low-code/SaaS solutions wired together by an orchestration tool (**self-hosted n8n** is the chosen spine) over a custom-built application. Downstream architecture should default to "which existing tool does this and how does n8n connect it," not "what do we code." Custom code is acceptable only where no existing tool meets a capability acceptably (the most likely such exception is Arabic-correct graphic rendering — see §13). This constraint exists to minimize build time, maintenance burden, and operational surface for a small team.

### Safety / Content integrity

- **Facts are deterministic, not generated.** Date, time, venue, and price come straight from the **Weekly List** into captions and graphics as fixed fields. Generated text is validated to contain the unchanged factual strings before a **Post** can enter the **Review Queue** (FR-3). The model writes flavor, never facts.
- **No hallucinated details.** Generation may only use provided **Event** fields; it must not invent performers, quotes, scarcity ("limited tickets!"), or any fact not in the input.
- **Pre-publish moderation.** Captions pass a moderation/sensitive-topic check tuned for the local Tunisian context before reaching the queue; the human gate is the final backstop.
- **Arabic never auto-ships.** Hard rule (FR-10): Arabic content requires native-speaker **Arabic Approval**.

### Brand voice

- **Versioned voice guidance + exemplars.** Each language has brand-voice guidance and a curated few-shot example bank; a banned-phrase list prevents generic marketing-speak ("Don't miss out!", emoji overload). The example bank is expected to grow and is the primary quality lever.

### Privacy / Cost

- **Cost awareness.** Per-channel API costs (notably X's paid tiers) and per-generation model costs are bounded by the weekly cadence; X's cost-effectiveness at weekly volume is an open decision (Q1/§13).

## 12. Aesthetic and Tone

- **Visual:** Tiween **Brand System** — Gold Leaf × Aubergine palette, taa logo, category color-coding, daylight surfaces (per the canonical UX design system). Graphics should feel like a confident cultural-authority brand, not a generic event aggregator.
- **Voice:** Culturally fluent and warm, not hypey. Arabic reads as natural Tunisian-audience copy (register per platform — see Q5); French is idiomatic; English is clean and secondary. The brand sounds like _someone who actually knows Tunisian culture_, never like a translation tool.
- **Anti-references:** generic "✨ Don't miss out! ✨" marketing-speak; stiff machine-Arabic / wrong-dialect bleed; emoji-saturated captions; clickbait.

## 13. Risk and Mitigations

| Risk                                                                                                                                                                                                                   | Severity    | Mitigation                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform access gates block the "all 4 channels at launch" goal.** TikTok requires an audit before public auto-posting (unaudited → draft only); X requires a paid API tier.                                         | High        | Per-channel enablement (FR-17): launch IG+FB live, run TikTok/X in manual-handoff mode until audits/access clear. Start platform approvals immediately, decoupled from build. Surface as Q1 for explicit decision.                                      |
| **Machine-Arabic erodes brand trust** with a Tunisian audience.                                                                                                                                                        | High        | Native per-language drafting (FR-4), mandatory **Arabic Approval** (FR-10), growing few-shot exemplar bank, proper-noun lock (FR-6). Never auto-publish Arabic.                                                                                         |
| **Wrong event facts published** (date/venue/time).                                                                                                                                                                     | High        | Facts-as-ground-truth (FR-3); fact-string validation before queue; facts rendered as fixed template fields, never generated.                                                                                                                            |
| **Arabic graphic rendering breaks on the chosen SaaS template engine** (Placid/Bannerbear shaping/RTL). The no-code graphics choice depends on the vendor handling Tunisian-Arabic shaping correctly — not guaranteed. | High        | **Render-test a long Tunisian-Arabic title on the candidate vendor before committing** (FR-8 visual QA). If it fails, this is the one capability where custom HTML→image rendering is an allowed exception to the assemble-over-build constraint (§11). |
| **n8n direct platform nodes lag platform requirements** (chose direct nodes over an aggregator → team owns Meta App Review + TikTok audit; node coverage for TikTok/X is the weak spot).                               | Medium-High | FR-17 manual-handoff fallback covers any platform whose direct node isn't ready; start Meta/TikTok approvals immediately; revisit an aggregator only if direct nodes prove insufficient.                                                                |
| **Silent publish failures / duplicates.**                                                                                                                                                                              | Medium      | Idempotency per (**Post**, **Channel**) and failure alerting (FR-16).                                                                                                                                                                                   |
| **TikTok is video-first**; image/photo-mode support varies — a launch channel may need video the MVP defers.                                                                                                           | Medium      | Flag video deferral as load-bearing (§6 Out of Scope note, Q6); manual-handoff fallback covers the gap short-term.                                                                                                                                      |

## 14. Integration and Dependencies

The pipeline is assembled from existing building blocks per the §11 build constraint. Each is a swappable dependency.

- **Orchestration: self-hosted n8n** — the workflow spine connecting intake, generation, the approval surface, and publishing. Dependency for every feature.
- **Approval surface: Airtable (as the Review Queue)** — content rows with graphic preview, per-language caption variants, status, and owner; n8n watches the status field to release approved items. Home of FR-10–FR-13. `[ASSUMPTION: Airtable; chosen as the recommended fit — confirm.]` (Resolves Q2: the queue lives in Airtable + n8n, not the Tiween Strapi backend.)
- **Graphics: SaaS template API (Placid or Bannerbear)** — Tiween templates designed once, filled per **Event** by n8n. Dependency for FR-7–FR-9. **Conditional on passing an Arabic-shaping render test (§13).**
- **Captions: an LLM via n8n** — multilingual generation per FR-4–FR-6. Model choice in addendum (Claude is the parent-stack default).
- **Social platform access (via n8n direct platform nodes):** Instagram + Facebook (business account + page link + Meta App Review), TikTok (Content Posting API audit), X (API tier). Critical-path external dependency owned by the team (no aggregator) — §13, Q1.
- **Tiween Brand System** — palette, logo, category colors, voice (existing UX design system). Dependency for FR-7, FR-8, §12.
- **Media storage** — for generated **Graphics** and source images (Tiween already uses ImageKit; see addendum).

_Specific vendor selection, n8n workflow design, and the build-vs-assemble decision per capability are detailed in `addendum.md`, not here._
