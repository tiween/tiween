# PRD Addendum — Social Content Automation Pipeline

Depth that belongs downstream (architecture / solution design) or earned a place but does not fit the PRD body. Capabilities-vs-implementation kept separable. Sourced from Discovery research (2026-06-17), not yet user-ratified.

---

## Research digest — landscape (market)

**Headline:** No off-the-shelf SaaS does the full loop (structured weekly event feed → branded multilingual graphics + captions + roundup → approval queue → multi-platform publish) well. Each product solves 1–2 stages. A **composed pipeline** beats any single SaaS for Tiween's Tunisian-derja + brand-locked + event-feed needs.

**Three architecture paths considered:**

- **A — All-in-one SaaS** (Predis/Ocoya): fastest, but poor derja + low brand control. Pilot only.
- **B — No-code glue** (Make/n8n + Placid/Bannerbear + Ayrshare + Slack approval): pragmatic MVP.
- **C — Custom app** (HTML→Playwright graphics + LLM + Ayrshare + own approval UI in Strapi): eventual target; best derja + brand control; reuses existing Strapi + design system.

**Recommended trajectory (from research):** Start B to validate the loop + derja quality fast, optionally graduate to C.

## DECIDED DIRECTION (user, 2026-06-17): Path B — assemble, don't build

Per explicit user steer ("opt for existing solutions as much as possible, e.g. n8n"), the project commits to **Path B (no-code/low-code assembly)** as the build approach — now a PRD §11 constraint, not just a starting point. Chosen building blocks:

| Capability              | Chosen approach                                 | Notes / risk                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestration           | **Self-hosted n8n**                             | Own infra; no per-execution fee; team owns ops/updates. The spine connecting every stage.                                                                                                                                                                                                          |
| Approval / Review Queue | **Airtable** (recommended fit)                  | Grid: image-attachment field + per-language caption columns + status field + owner. n8n watches `status` to release approved rows. Distinct Arabic-gate via a separate status/owner. Resolves PRD Q2 (not Strapi). Confirm vs. Notion.                                                             |
| Graphics                | **SaaS template API — Placid or Bannerbear**    | Tiween templates designed once; n8n fills per event via API. **CONDITIONAL: must pass an Arabic-shaping render test** (long Tunisian title, RTL). If it fails, custom HTML→image (Playwright) is the one allowed exception to assemble-over-build.                                                 |
| Captions                | **LLM via n8n** (Claude default — parent stack) | Structured output `{ar,fr,en,hashtags[]}`, 2–3 variants/language, native per-language drafting, proper-noun glossary. Mandatory AR human review.                                                                                                                                                   |
| Publishing              | **n8n direct platform nodes** (IG/FB/TikTok/X)  | User chose direct nodes over an aggregator (Ayrshare) to avoid subscription. **Tradeoff:** team owns Meta App Review + TikTok audit; node coverage for TikTok/X is the weak spot → FR-17 manual-handoff fallback is the safety net. Revisit an aggregator only if direct nodes prove insufficient. |
| Media storage           | **ImageKit** (already in parent stack)          | Store generated PNGs + source images.                                                                                                                                                                                                                                                              |
| Scheduling              | **n8n schedule/cron + wait nodes**              | Weekly batch trigger; per-post scheduled publish. Replaces the BullMQ approach from the custom-app path.                                                                                                                                                                                           |

**Divergence from research note:** research recommended Ayrshare (aggregator) and a custom Strapi plugin (Path C target); user chose direct n8n nodes + Airtable instead, accepting more platform-auth burden in exchange for no aggregator fee and no custom build. Logged in `.decision-log.md`.

## Research digest — technical options (Path C reference — SUPERSEDED by the decided Path B above)

> The section below is the research's **custom-app (Path C)** analysis. It is retained as a future reference if the team ever outgrows the no-code Path B, but it is **not the chosen direction**. Where it conflicts with the "DECIDED DIRECTION" table above (e.g. Strapi plugin, BullMQ, Ayrshare-primary), the table wins.

**Graphics:** Playwright screenshot of a Next.js render route → PNG → ImageKit. Chooses Chromium for correct Arabic shaping (Satori/@vercel/og has weak HarfBuzz shaping — avoid for AR text). $0 marginal cost. Fallback: Placid (cheapest SaaS with good DX) if non-devs must own templates or render-ops burden grows. Avoid Canva's weak RTL output.

**Captions:** Claude (Sonnet routine / Opus for weekly roundup synthesis), structured output `{ar, fr, en, hashtags[]}`, 2–3 variants per language. Already in parent stack. Fallback GPT-4o behind a `CaptionProvider` interface. Mandatory native-Arabic human review — never auto-publish AR.

**Publishing:** Ayrshare aggregator for launch behind a `Publisher` interface; migrate to direct Meta/TikTok/X per-channel post-audit. Hard platform gates: IG needs Business/Creator acct linked to FB Page + Meta App Review (`instagram_content_publish`), ~25–50 posts/24h. TikTok Content Posting API needs audit; **unaudited apps can only post private/draft** → phase as draft-push first. X API paid tiers (Free low caps may fit weekly cadence; Basic ~$200/mo). FB easiest.

**Approval + storage:** Strapi v5 as review/CMS surface, implemented as a custom `social-publisher` plugin (idiomatic — matches existing ticketing/venues/events-manager pattern). Content-types with status state machine `draft → pending_review → approved → scheduled → published → failed`. Binaries in ImageKit; system-of-record + audit trail in PostgreSQL.

**Orchestration:** BullMQ on existing Redis (queues: caption / render / publish-delayed + weekly repeatable batch-assemble). Not n8n. Run in long-lived Node worker, NOT Vercel edge.

**Abstraction seams (keep clean):** `CaptionProvider` (Claude↔GPT-4o), `RenderProvider` (Playwright↔Placid), `Publisher` (Ayrshare↔direct).

## Quality guardrails (cross-cutting — informs PRD NFRs)

**Core philosophy: deterministic for facts, generative for flavor, human for final sign-off.**

- **Structured feed = ground truth.** Date/time/venue/price/lineup rendered as fixed template fields, NOT generated. LLM writes only surrounding prose. Validate generated text contains unchanged factual strings before it reaches the queue. (#1 guardrail — prevents wrong event details.)
- **Per-language native drafting**, never machine-translate a master. Separate FR + AR-derja brand-voice prompts with few-shot Tiween exemplars + proper-noun glossary (venues/artists/titles). Register per platform (derja/Arabizi for TikTok/IG; more MSA/French for FB).
- **Per-platform deterministic formatting** (char/hashtag limits, bidi handling — hashtags/@mentions on trailing lines for mixed-script).
- **Pre-publish moderation** + sensitive-topic blocklist tuned for local (Tunisian) context.
- **Idempotency** keys per (event, platform) to prevent double-posts on retry; store permalink on success; alert on failure, never silent-retry.
- **Brand-voice:** versioned prompt + few-shot exemplars + banned-phrase list (no "Don't miss out", no emoji overload).

## Risks / unknowns to verify before build

- TikTok Content Posting API audit timeline + photo/carousel (vs video) support for Tunisia region.
- Meta App Review timeline for IG/FB publishing permissions.
- X API current tier pricing — decide if X is worth it at weekly cadence.
- Each image-API vendor's actual Arabic/RTL shaping (do a real long-Tunisian-title render test).
- Playwright render-infra ops (memory, Chromium pinning) in production worker.
