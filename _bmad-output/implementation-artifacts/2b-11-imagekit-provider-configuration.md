# Story 2B.11: ImageKit Provider Configuration

Status: review

---

## Story

As a **developer**,
I want to configure ImageKit as the media provider,
So that images are served via CDN with optimization.

## Acceptance Criteria

1. **AC#1**: ImageKit plugin is installed and configured
2. **AC#2**: ImageKit credentials are configured via environment variables
3. **AC#3**: Uploaded images are stored in ImageKit
4. **AC#4**: Image URLs use ImageKit CDN with transformations
5. **AC#5**: CSP middleware is updated to allow ImageKit domains
6. **AC#6**: Fallback to local storage works in development (when credentials not set)
7. **AC#7**: Configuration is documented in .env.example

## Tasks / Subtasks

- [x] **Task 1: Install ImageKit Plugin** (AC: #1)

  - [x] 1.1 Install `strapi-plugin-imagekit` package
  - [x] 1.2 Rebuild Strapi to register plugin

- [x] **Task 2: Add Environment Variables** (AC: #2, #7)

  - [x] 2.1 Add IMAGEKIT_PUBLIC_KEY to .env.example
  - [x] 2.2 Add IMAGEKIT_PRIVATE_KEY to .env.example
  - [x] 2.3 Add IMAGEKIT_URL_ENDPOINT to .env.example
  - [x] 2.4 Add IMAGEKIT_FOLDER (optional) to .env.example

- [x] **Task 3: Configure Plugin** (AC: #1, #3, #4)

  - [x] 3.1 Add imagekit plugin configuration to config/plugins.ts
  - [x] 3.2 Configure upload settings with folder path
  - [x] 3.3 Enable conditional activation based on credentials

- [x] **Task 4: Update CSP Middleware** (AC: #5)

  - [x] 4.1 Add ik.imagekit.io to img-src directive
  - [x] 4.2 Add eml.imagekit.io to frame-src directive

- [x] **Task 5: Configure Fallback** (AC: #6)

  - [x] 5.1 Ensure local storage works when ImageKit is not configured
  - [x] 5.2 Add conditional enable based on credentials presence (!!env("IMAGEKIT_PUBLIC_KEY"))

- [x] **Task 6: Verify Build**
  - [x] 6.1 Ensure no build errors

---

## Dev Notes

### Architecture Decision Reference

From `core-architectural-decisions.md`:

```
Media: ImageKit - Image storage, optimization, CDN
QR Storage: ImageKit + IndexedDB - CDN delivery + offline access
```

### ImageKit Use Cases in Tiween

1. **Event Posters**: Film and event promotional images
2. **Venue Images**: Venue photos and logos
3. **Person Photos**: Director, actor profile images
4. **QR Codes**: Ticket QR codes (generated server-side, stored in ImageKit)
5. **User Avatars**: Profile pictures

### Plugin vs Provider Approach

**Option A: strapi-plugin-imagekit** (Recommended)

- Full integration with Strapi Media Library
- Browse ImageKit library directly in Strapi
- Real-time image transformations
- Bulk import existing assets
- Signed URLs support

**Option B: strapi-provider-upload-imagekit**

- Simple upload provider replacement
- Less features, simpler setup
- May have compatibility issues with Strapi v5

We'll use **strapi-plugin-imagekit** for the full feature set.

### Environment Variables

```bash
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=public_xxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
IMAGEKIT_FOLDER=tiween
```

### Plugin Configuration

```typescript
// config/plugins.ts
export default ({ env }) => ({
  // ... other plugins

  imagekit: {
    enabled: !!env("IMAGEKIT_PUBLIC_KEY"),
    config: {
      publicKey: env("IMAGEKIT_PUBLIC_KEY"),
      privateKey: env("IMAGEKIT_PRIVATE_KEY"),
      urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
      folder: env("IMAGEKIT_FOLDER", "tiween"),
    },
  },
})
```

### CSP Middleware Update

```typescript
// config/middlewares.ts
{
  name: "strapi::security",
  config: {
    contentSecurityPolicy: {
      directives: {
        "img-src": [
          "'self'",
          "blob:",
          "data:",
          "ik.imagekit.io",        // ImageKit CDN
          // ... other sources
        ],
        "frame-src": [
          "'self'",
          "eml.imagekit.io",       // ImageKit embed
        ],
      },
    },
  },
},
```

### Image Transformation Examples

ImageKit supports URL-based transformations:

```
Original: https://ik.imagekit.io/your_id/tiween/poster.jpg
Thumbnail: https://ik.imagekit.io/your_id/tiween/poster.jpg?tr=w-200,h-300
WebP: https://ik.imagekit.io/your_id/tiween/poster.jpg?tr=f-webp
Quality: https://ik.imagekit.io/your_id/tiween/poster.jpg?tr=q-80
```

### Development Mode

When ImageKit credentials are not set:

- Plugin is disabled (`enabled: !!env("IMAGEKIT_PUBLIC_KEY")`)
- Falls back to local file storage (default Strapi behavior)
- No changes required for development workflow

### Migration Path for Legacy Images

For migrating existing images from legacy system:

1. Export image URLs from legacy database
2. Use ImageKit's URL fetch feature to import images
3. Update database references to new ImageKit URLs
4. This will be handled in Story 2B.14 (Data Migration)

### Testing ImageKit Integration

1. Set environment variables in `.env`
2. Start Strapi: `yarn develop`
3. Navigate to Admin Panel → Settings → ImageKit
4. Verify connection status
5. Upload test image via Media Library
6. Verify image URL uses ImageKit CDN

### References

- [ImageKit Strapi Integration](https://imagekit.io/docs/integration/strapi)
- [Strapi Market - ImageKit Plugin](https://market.strapi.io/plugins/strapi-plugin-imagekit)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.11]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Installed `strapi-plugin-imagekit` v1.0.2 for full ImageKit integration
- Added ImageKit environment variables to .env.example (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_FOLDER)
- Configured plugin in config/plugins.ts with conditional enable (`!!env("IMAGEKIT_PUBLIC_KEY")`)
- Updated CSP middleware to allow ImageKit domains (ik.imagekit.io for images, eml.imagekit.io for embeds)
- Plugin disabled by default (requires credentials) - local storage used as fallback
- Build verified successfully
- Plugin provides: Media Library integration, bulk import, optimized delivery, signed URLs

### File List

- `apps/strapi/package.json` - Added strapi-plugin-imagekit dependency
- `apps/strapi/.env.example` - Added ImageKit environment variables
- `apps/strapi/config/plugins.ts` - Added imagekit plugin configuration
- `apps/strapi/config/middlewares.ts` - Added ImageKit domains to CSP
