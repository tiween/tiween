import type { Core } from "@strapi/strapi"

import { createShortFilmPublishGuard } from "./document-middlewares/short-film-publish-guard"

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // D-19: every publish path (content-manager single and bulk, releases, status
  // published writes) converges on the Document Service, so one middleware
  // guards them all. Registered here, at register time, so it is active before
  // any request or bootstrap script can publish.
  strapi.documents.use(createShortFilmPublishGuard(strapi))
}
