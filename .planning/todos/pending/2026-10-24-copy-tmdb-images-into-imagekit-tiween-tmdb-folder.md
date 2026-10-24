---
created: 2026-10-24T12:00:00.000Z
title: Copy TMDB images into the ImageKit tiween/tmdb folder
area: integrations
severity: minor
files:
  - apps/strapi/src/plugins/tmdb-integration/server/src/services/image.ts
  - apps/strapi/src/plugins/tmdb-integration/server/src/services/movie.ts
---

## Problem

Owner decision (2026-10-24): TMDB assets must live in a `tmdb` folder under the ImageKit `tiween` endpoint, i.e. `ik.imagekit.io/bc2xslzyt/tiween/tmdb/...`.

ImageKit cannot proxy that path: a URL endpoint forwards the whole path after its prefix to the origin, so `/tiween/tmdb/t/p/w500/x.jpg` would fetch `image.tmdb.org/tmdb/t/p/w500/x.jpg` (404). There is no path-strip setting for web-folder origins (URL rewriters only exist for Cloudinary/Imgix/Akamai). The plan's 3-custom-endpoint limit is also full (`tiween`, `octopus`, `emtb`).

Today the `tmdb-integration` image service builds direct `https://image.tmdb.org/t/p/<size><path>` URLs. The `tiween` endpoint (id `t1CG8mnt9`) still proxies TMDB at `/tiween/t/p/...` via the "TheMovieDB Images" web-folder origin (`cStguM5bq`); a rename of its prefix to `tmdb` was tried and reverted on 2026-10-24.

## Solution

- On TMDB import, download each poster/backdrop/profile once and upload it through the Strapi upload service into a Media Library folder that the ImageKit provider maps to `tiween/tmdb/` (folder mirroring is the 2026-10-24 quick task "Mirror Strapi Media Library folders in ImageKit uploads"; decide whether `tmdb` sits outside the `<env>` folder, as the owner's layout shows, and how the provider expresses that).
- Reuse the seed's SSRF-safe downloader and idempotent-by-name upload (`apps/strapi/scripts/seeds/utils/media-upload.ts`) rather than writing a second one.
- Keep the TMDB proxy origin on the `tiween` endpoint as a fallback for paths not copied yet.
- Verify after the ImageKit key is rotated: a file uploaded to Media Library path `/tiween/tmdb/...` must load from `ik.imagekit.io/bc2xslzyt/tiween/tmdb/...` through the prefixed endpoint (confirms ImageKit resolves the Media Library before the origin for a prefixed endpoint).
- Check TMDB's terms on caching/storing images and attribution before shipping.
