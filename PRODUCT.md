# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Tiween is Tunisia's cultural compass: a discovery-first, trilingual (FR / AR with full RTL / EN) agenda and catalog for cinema, theatre, short films, concerts and exhibitions. v1.0 is a finished short-film directory on real Strapi data.

This root file is an umbrella only. Each UI app carries its own product record and design system, and Impeccable resolves the child file when run from (or targeted at) that app:

| App           | Surface                                           | Product record                                   | Design system                                                                     |
| ------------- | ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `apps/client` | Public Next.js PWA for culture-goers              | [apps/client/PRODUCT.md](apps/client/PRODUCT.md) | [apps/client/DESIGN.md](apps/client/DESIGN.md) (Tiween DS, Gold Leaf × Aubergine) |
| `apps/strapi` | Internal Strapi v5 admin (local plugin admin UIs) | [apps/strapi/PRODUCT.md](apps/strapi/PRODUCT.md) | [apps/strapi/DESIGN.md](apps/strapi/DESIGN.md) (Strapi Design System v2)          |

## Capabilities and Constraints

- The two design systems never mix: the public site never uses Strapi DS, and the admin never takes the Tiween brand.
- Run Impeccable from inside `apps/client` or `apps/strapi` (or pass `--target apps/<app>/...`). There is deliberately no root `DESIGN.md`.
- The `packages/*` workspaces have no UI and inherit this file only nominally.
