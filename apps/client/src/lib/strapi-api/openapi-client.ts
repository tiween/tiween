import { env } from "@/env.mjs"
import createClient from "openapi-fetch"

import type { paths } from "@/types/strapi-openapi"

// Regenerate types with `yarn gen:strapi-types` (Strapi must be running).
// Prefer BaseStrapiClient for Strapi core content-types — it keeps populate-aware response typing.
export const strapiOpenApi = createClient<paths>({
  baseUrl: `${env.STRAPI_URL}/api`,
})
