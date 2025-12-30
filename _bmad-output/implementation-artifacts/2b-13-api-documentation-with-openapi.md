# Story 2B.13: API Documentation with OpenAPI

Status: ready-for-dev

---

## Story

As a **developer**,
I want to generate OpenAPI documentation for the API,
So that frontend developers have clear API reference.

## Acceptance Criteria

1. **AC#1**: `@strapi/plugin-documentation` is installed and configured
2. **AC#2**: OpenAPI spec is generated at `/documentation`
3. **AC#3**: Swagger UI is accessible for API exploration
4. **AC#4**: All endpoints are documented with:
   - Request/response schemas
   - Authentication requirements
   - Example payloads
5. **AC#5**: Documentation updates automatically with schema changes
6. **AC#6**: API security requirements (bearerAuth) are documented
7. **AC#7**: Server URLs are configured for development and production

## Tasks / Subtasks

- [ ] **Task 1: Install Documentation Plugin** (AC: #1)

  - [ ] 1.1 Install `@strapi/plugin-documentation` package
  - [ ] 1.2 Rebuild Strapi to register plugin

- [ ] **Task 2: Configure Documentation Plugin** (AC: #1, #6, #7)

  - [ ] 2.1 Add documentation plugin configuration to config/plugins.ts
  - [ ] 2.2 Configure OpenAPI version (3.0.0)
  - [ ] 2.3 Configure API info (title, version, description)
  - [ ] 2.4 Configure server URLs (development + production)
  - [ ] 2.5 Configure security schemes (bearerAuth for JWT)
  - [ ] 2.6 Include users-permissions and upload plugins

- [ ] **Task 3: Verify Generated Documentation** (AC: #2, #3, #4, #5)

  - [ ] 3.1 Start Strapi and access `/documentation`
  - [ ] 3.2 Verify Swagger UI is accessible
  - [ ] 3.3 Verify all content-types have endpoints documented
  - [ ] 3.4 Verify request/response schemas are generated
  - [ ] 3.5 Test "Try it out" functionality with authentication

- [ ] **Task 4: Customize Documentation (Optional)** (AC: #4)

  - [ ] 4.1 Add example payloads for key endpoints if needed
  - [ ] 4.2 Add description overrides for complex endpoints
  - [ ] 4.3 Configure endpoint grouping/tags

- [ ] **Task 5: Configure Access Control** (AC: #3)
  - [ ] 5.1 Configure documentation access (public in dev, restricted in prod)
  - [ ] 5.2 Verify admin panel documentation settings
  - [ ] 5.3 Test regeneration from admin panel

---

## Dev Notes

### Architecture Decision Reference

From `core-architectural-decisions.md`:

```
API & Communication Patterns:
| Decision              | Choice                    | Rationale                              |
|-----------------------|---------------------------|----------------------------------------|
| API Style             | REST                      | Simpler caching, standard Strapi       |
| API Documentation     | Strapi built-in (OpenAPI) | Auto-generated from content types      |
```

### Plugin Installation

```bash
# Install the documentation plugin
yarn add @strapi/plugin-documentation

# Rebuild Strapi
yarn build
```

### Plugin Configuration

```typescript
// config/plugins.ts
export default ({ env }) => ({
  // ... other plugins (i18n, upload, imagekit, email, etc.)

  documentation: {
    enabled: true,
    config: {
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "Tiween API",
        description: `
## Tiween Event Discovery & Ticketing Platform API

This API provides access to:
- **Events & Creative Works**: Films, plays, concerts, and exhibitions
- **Venues**: Cinemas, theaters, and cultural centers across Tunisia
- **Ticketing**: Purchase tickets, manage orders, validate QR codes
- **User Management**: Authentication, profiles, and watchlists

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Localization
The API supports three locales: \`fr\` (French), \`ar\` (Arabic), \`en\` (English).
Use the \`locale\` query parameter to fetch localized content.
        `,
        termsOfService: "https://tiween.tn/terms",
        contact: {
          name: "Tiween Support",
          email: "support@tiween.tn",
          url: "https://tiween.tn",
        },
        license: {
          name: "Proprietary",
          url: "https://tiween.tn/license",
        },
      },
      "x-strapi-config": {
        // Include these plugins in documentation
        plugins: ["upload", "users-permissions"],
        // Documentation endpoint path
        path: "/documentation",
      },
      servers: [
        {
          url: env("APP_URL", "http://localhost:1337") + "/api",
          description:
            env("NODE_ENV") === "production"
              ? "Production server"
              : "Development server",
        },
        // Add staging server if needed
        ...(env("STAGING_URL")
          ? [
              {
                url: env("STAGING_URL") + "/api",
                description: "Staging server",
              },
            ]
          : []),
      ],
      externalDocs: {
        description: "Tiween Developer Documentation",
        url: "https://docs.tiween.tn",
      },
      security: [{ bearerAuth: [] }],
      // Define security schemes
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token obtained from /api/auth/local",
          },
        },
      },
    },
  },
})
```

### Content-Types to Document

The documentation plugin will auto-generate docs for all these content-types:

| Content-Type  | Endpoint               | Description                   |
| ------------- | ---------------------- | ----------------------------- |
| Event         | `/api/events`          | Event listings with showtimes |
| CreativeWork  | `/api/creative-works`  | Films, plays, concerts        |
| Venue         | `/api/venues`          | Cinemas, theaters             |
| Person        | `/api/people`          | Directors, actors             |
| Genre         | `/api/genres`          | Content categories            |
| Category      | `/api/categories`      | Event categories              |
| Region        | `/api/regions`         | Geographic regions            |
| City          | `/api/cities`          | Cities within regions         |
| TicketOrder   | `/api/ticket-orders`   | Purchase orders               |
| Ticket        | `/api/tickets`         | Individual tickets            |
| UserWatchlist | `/api/user-watchlists` | Saved events                  |

### Authentication Endpoints

The users-permissions plugin adds these endpoints:

| Endpoint                    | Method | Description               |
| --------------------------- | ------ | ------------------------- |
| `/api/auth/local`           | POST   | Login with email/password |
| `/api/auth/local/register`  | POST   | Register new user         |
| `/api/auth/forgot-password` | POST   | Request password reset    |
| `/api/auth/reset-password`  | POST   | Reset password with token |
| `/api/users/me`             | GET    | Get current user profile  |

### Access Control Configuration

In Strapi Admin Panel → Settings → Documentation:

**Development:**

- Documentation endpoint: Public (for easy testing)

**Production:**

- Documentation endpoint: Restricted (require authentication)
- Or use environment variable to disable entirely

```typescript
// Conditional documentation access
documentation: {
  enabled: env("DOCS_ENABLED", "true") === "true",
  config: {
    // ... rest of config
  },
},
```

### Environment Variables

```bash
# .env.example additions

# ------- API Documentation -------

# Enable/disable API documentation (default: true)
DOCS_ENABLED=true

# Staging server URL (optional, for multi-server docs)
# STAGING_URL=https://staging.tiween.tn
```

### Accessing Documentation

1. **Swagger UI**: `http://localhost:1337/documentation`
2. **OpenAPI JSON**: `http://localhost:1337/documentation/v1.0.0/openapi.json`
3. **Admin Panel**: Settings → Documentation → Open documentation

### Regenerating Documentation

Documentation regenerates automatically when:

- Content-types change
- Strapi restarts

Manual regeneration:

- Admin Panel → Settings → Documentation → Regenerate

### Custom Endpoint Descriptions (Optional)

If default descriptions are insufficient, use `mutateDocumentation`:

```typescript
// config/plugins.ts
documentation: {
  config: {
    "x-strapi-config": {
      plugins: ["upload", "users-permissions"],
      path: "/documentation",
      mutateDocumentation: (draft) => {
        // Add custom description for events endpoint
        if (draft.paths["/events"]) {
          draft.paths["/events"].get.summary = "List all events";
          draft.paths["/events"].get.description = `
            Returns a paginated list of events with optional filtering.

            **Filters:**
            - \`filters[venue][id][$eq]=1\` - Filter by venue
            - \`filters[status][$eq]=scheduled\` - Filter by status
            - \`filters[startDate][$gte]=2025-01-01\` - Filter by date

            **Population:**
            - \`populate[creativeWork]=*\` - Include creative work details
            - \`populate[venue]=*\` - Include venue details
          `;
        }
      },
    },
  },
},
```

### Example API Responses

**Event List Response:**

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "attributes": {
        "startDate": "2025-01-15T00:00:00.000Z",
        "endDate": "2025-01-31T00:00:00.000Z",
        "status": "scheduled",
        "featured": true,
        "creativeWork": {
          "data": {
            "id": 1,
            "attributes": {
              "title": "Film Title",
              "type": "film",
              "duration": 120
            }
          }
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 4,
      "total": 100
    }
  }
}
```

### Testing Documentation

1. Start Strapi: `yarn develop`
2. Open browser: `http://localhost:1337/documentation`
3. Click "Authorize" and enter JWT token
4. Test endpoints using "Try it out"

### Previous Story Context

From **Story 2B.12 (Email Configuration with Brevo)**:

- Similar plugin configuration pattern in `config/plugins.ts`
- Plugin enabled by default, can be disabled via environment variable

### Files to Create/Modify

**Modified Files:**

- `apps/strapi/package.json` - Add @strapi/plugin-documentation
- `apps/strapi/config/plugins.ts` - Add documentation plugin configuration
- `apps/strapi/.env.example` - Add DOCS_ENABLED variable (optional)

### Verification Checklist

- [ ] Plugin installs without errors
- [ ] Documentation accessible at `/documentation`
- [ ] All content-types have generated endpoints
- [ ] Authentication (bearerAuth) is documented
- [ ] Request/response schemas are accurate
- [ ] "Try it out" works with valid JWT
- [ ] Documentation regenerates on schema changes

### References

- [Strapi Documentation Plugin](https://docs.strapi.io/dev-docs/plugins/documentation)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.13]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#API & Communication Patterns]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
