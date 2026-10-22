## Tiween build rules (owner directive, enforced by blocking gates after planning)

1. **Plugin-first.** New Strapi backend or admin capability goes in a local plugin under
   `apps/strapi/src/plugins/<name>/` (server + admin), not in `apps/strapi/src/api/`.
   Reuse an existing plugin when the domain fits (creative-works, venues, events-manager,
   geography, entity-properties, user-engagement, ticketing, payments, tmdb-integration).
   Data entry gets a custom plugin admin page when the default Content Manager form is not
   a good editing workflow. A plan that must touch `apps/strapi/src/api/` declares
   `plugin_waiver: "<reason>"` in its frontmatter; the gate rejects it otherwise.

2. **Design docs before build.** Before any code, the phase folder holds:

   - `DESIGN.md`: visual spec (layout, components, tokens, responsive and RTL behavior).
   - `EXPERIENCE.md`: flows, data-input workflow, states (empty, loading, error, success), copy.
     Its frontmatter carries `mockup_status: approved` once the owner has reviewed the
     Claude Design mockups (link them under `mockups:`), or `mockup_status: not-applicable`
     with `mockup_waiver: "<reason>"` for phases with no user-facing or data-entry surface.
     If they are missing, the first plan's first task is to write them and stop at a
     `checkpoint:human-verify` for mockup review. Do not plan implementation tasks that
     precede approval.

3. **Pick the right design system.**
   - Strapi admin (plugin `admin/src/**`): Strapi Design System v2. Load the
     `strapi-design-system` project skill and the `strapi-ui-design` plugin skill.
   - Public site (`apps/client/**`): Tiween DS (Gold Leaf x Aubergine, shadcn), canonical
     spines in `_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/`.
     Never mix them.
