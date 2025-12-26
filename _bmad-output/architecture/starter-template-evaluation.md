# Starter Template Evaluation

## Primary Technology Domain

Full-Stack PWA (Two-Sided Marketplace) based on project requirements analysis.

## Starter Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **notum-cz/strapi-next-monorepo-starter** | Pre-configured Strapi v5 + Next.js 16.1 + Turborepo + shadcn/ui + auth + i18n | No Storybook (easy to add) | ✅ Selected |
| Fresh create-next-app + create-strapi-app | Full control | Manual monorepo setup, more config work | ❌ More effort |
| T3 Stack | Great DX | No Strapi, would need to add | ❌ Different backend |

## Selected Starter: notum-cz/strapi-next-monorepo-starter

**Rationale for Selection:**
- Pre-integrated Strapi v5 + Next.js 16.1 with Turborepo saves significant setup time
- Includes shadcn/ui, Tailwind v4, and auth (NextAuth) matching our UX spec requirements
- Multi-language support (next-intl) aligns with trilingual requirement
- Docker support compatible with Dokploy deployment target
- Well-structured packages folder for shared design system and types

**Initialization Command:**

```bash
# Clone template
git clone https://github.com/notum-cz/strapi-next-monorepo-starter tiween
cd tiween

# Switch to Node 22 and install
nvm use
yarn install

# Add Storybook to frontend app
cd apps/ui
npx storybook@latest init --builder vite
```

**Architectural Decisions Provided by Starter:**

| Category | Decision |
|----------|----------|
| **Language & Runtime** | TypeScript (strict), Node.js 22, Yarn workspaces |
| **Styling** | Tailwind CSS v4, shadcn/ui, CSS variables |
| **Build Tooling** | Turborepo, Vite (Storybook), Turbopack (Next.js 16.1 default bundler) |
| **Code Organization** | `apps/` for deployables, `packages/` for shared code |
| **Auth** | NextAuth.js with JWT |
| **i18n** | next-intl |
| **CI/CD** | GitHub Actions, Docker, Husky pre-commit |

**Customizations Required:**
1. Add Storybook with `@storybook/nextjs-vite`
2. Configure for Dokploy deployment
3. Recreate Events Manager Strapi plugin
4. Port legacy components to new design system
5. Add PWA configuration (next-pwa or Serwist)
6. Migrate existing data from Strapi v4

**Note:** Project initialization using this template should be the first implementation story.

---
