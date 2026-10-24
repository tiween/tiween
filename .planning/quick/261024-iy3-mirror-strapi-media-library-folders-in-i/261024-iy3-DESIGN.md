---
quick_id: 261024-iy3
surface: none
design_system: not-applicable
---

# Design: Mirror Strapi Media Library folders in ImageKit uploads

No visual surface. This task changes where the Strapi upload provider stores files in
ImageKit, with no change to admin or public UI. No layout, components, tokens, responsive
or RTL behaviour applies. The Strapi Design System and Tiween DS are untouched.

## Storage layout spec (owner-approved, locked)

```
<IMAGEKIT_FOLDER, default "tiween">/<env folder>/<slugified Media Library folder names...>/<hash><ext>
files with no Media Library folder -> <root>/<env>/unsorted/
```

Example: `tiween/development/short-films/posters/poster_abc123.jpg` and its derived
`tiween/development/short-films/posters/thumbnail_poster_abc123.jpg`.

- Env folder: `IMAGEKIT_ENV_FOLDER`, default `production` when `NODE_ENV=production`, else `development`.
- Folder segments: lowercase ASCII and hyphens. A name that slugifies to nothing (Arabic, symbols)
  falls back to a segment built from the folder's `pathId`.
- Derived files (thumbnail and every responsive breakpoint) share their parent's folder.
