# Epic 1 Context: Project Foundation & Infrastructure

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up a fully configured Turborepo monorepo (Next.js 16.1 client + Strapi v5 backend + shared packages) with every cross-cutting concern wired before feature work begins: brand design tokens, a shadcn/ui component base, Storybook, trilingual i18n with RTL, PWA offline support, containerized local + production deployment, and a CI pipeline whose quality gates actually block bad code. It matters because all later epics build in parallel on these foundations — a missing or toothless gate here (as the ESLint enforcement gap proved) silently degrades every downstream epic.

## Stories

- Story 1.1: Initialize monorepo from starter template
- Story 1.2: Upgrade to Next.js 16.1 with Turbopack
- Story 1.3: Configure Tiween design tokens and Tailwind theme
- Story 1.4: Setup shadcn/ui with brand customization
- Story 1.5: Configure Storybook with Vite builder
- Story 1.6: Configure i18n with RTL support
- Story 1.7: Setup Serwist PWA configuration
- Story 1.8: Configure Docker and Dokploy deployment
- Story 1.9: Setup CI/CD pipeline with GitHub Actions
- Story 1.10: Restore client ESLint enforcement
- Story 1.11: Bring the Strapi backend under lint
- Story 1.12: i18n Western-numeral lint guard
- Story 1.13: Repo-hygiene CI guard for non-UTF-8 / control-byte files

## Requirements & Constraints

- Mobile-first for Chrome Android on variable 4G; offline resilience is a product requirement, not a nice-to-have, so PWA caching and an offline fallback are part of the foundation.
- Trilingual Arabic / French / English with French as default; Arabic must render RTL and language switching must be instant with no page reload.
- Numbers must always be displayed in Western numerals — Arabic-Indic numeral output is a recurring defect and must be prevented mechanically, not by convention.
- Dark theme only; no light-mode toggle. Accessibility target is WCAG 2.1 AA with brand-yellow focus rings and 44px minimum (48px preferred) touch targets.
- Quality gates must be real and consistent: the same lint strictness applies locally (pre-commit), in `turbo lint`, and in CI, for both the client and the Strapi backend. Lint must fail on a newly introduced `any`, unused variable, or raw `<img>`.
- Backend and frontend lint configs stay separate but both must be ESLint flat config (legacy `.eslintrc.*` is dropped in ESLint 10).
- Source files must be valid UTF-8 without control bytes; a binary source file must fail CI.
- CI must cover lint, TypeScript strict type-check, unit tests, and production builds of all apps, with Turborepo remote/local caching enabled.

## Technical Decisions

- Stack: Turborepo + Yarn workspaces, Node 22, TypeScript strict. Apps are `apps/client` (Next.js 16.1 App Router, Turbopack) and `apps/strapi` (Strapi v5); shared packages cover types, ESLint config, and TypeScript config.
- Styling: Tailwind v4 with shadcn/ui on top; brand tokens are dark teal (#032523) as primary background, yellow (#F8EB06) as accent/CTA/focus, plus elevated surface shades. CSS variables back the shadcn token names so components inherit brand automatically. 4px spacing base.
- Typography: Lalezar for display headings, Inter for Latin body text, Noto Sans Arabic for Arabic body text.
- i18n via next-intl with locale-prefixed routing and a `[locale]` segment; middleware handles detection/redirect; Tailwind `rtl:` variant handles directional styling and Radix primitives supply RTL-correct behavior.
- PWA via Serwist: cache-first for static assets, network-first with fallback for API routes; installable manifest using brand colors.
- Runtime services: PostgreSQL 16 and Redis 7 alongside both apps, orchestrated by Docker Compose locally and deployed as containers on Dokploy (which also terminates SSL and reverse-proxies). Same container set in dev and prod, with multi-stage builds and health checks in prod.
- Testing tools chosen at foundation level: Vitest for unit/component (with Storybook), Playwright for E2E.
- Lint enforcement approach: the blanket warning-downgrade plugin is removed from all shared presets and `--max-warnings=0` is applied, so severities configured in the presets are authoritative. The one-time backlog of surfaced violations is paid down or downgraded _deliberately per rule_ — never left as an accidental baseline.
- Once real lint enforcement exists on both apps, the documented PR gate becomes: lint (both apps, zero warnings) + type-check + tests + repo grep gates + Strapi reviewer pass.

## UX & Interaction Patterns

- The foundation must make the signature interactions cheap for later epics: instant RTL/LTR flip from a header toggle, one-tap actions with immediate visual feedback, and poster-forward dark layouts.
- Storybook is the isolation surface for component work and must ship an RTL/LTR decorator, dark theme by default, and mobile (375px) / tablet (768px) / desktop (1280px) viewport presets.
- All shadcn components must be verified in RTL mode, not just LTR.

## Cross-Story Dependencies

- Strictly sequential foundation chain: 1.1 → 1.2 → 1.3 → 1.4 → 1.5; i18n (1.6) and PWA (1.7) both depend on the configured Next.js app; 1.8 depends on the full monorepo; 1.9 depends on 1.8 for build targets.
- Lint hardening sequence: 1.10 → 1.11 → 1.12 → 1.13. 1.10 gates 1.12 (a numeral guard is meaningless without real enforcement). 1.10/1.11 both feed the CI Lint job created in 1.9.
- 1.12 and 1.13 close open Epic 5 retrospective action items (recurring Arabic-Indic numeral bug; a binary source file that slipped past two reviews).
- Every other epic depends on this one; the lint gap in particular is a latent risk to in-flight backend work (Epic 6 ticketing especially), so 1.10/1.11 should land before deeper backend development.
