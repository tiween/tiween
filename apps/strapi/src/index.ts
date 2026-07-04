import type { Core } from "@strapi/strapi"

import { ensureAdminUser } from "./bootstrap/admin-user"
import { ensureI18nLocales } from "./bootstrap/i18n-locales"
import { ensureVenueManagerRole } from "./bootstrap/venue-manager-role"
import { registerAdminUserSubscriber } from "./lifeCycles/adminUser"
import { registerUserSubscriber } from "./lifeCycles/user"

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    registerAdminUserSubscriber({ strapi })
    registerUserSubscriber({ strapi })

    // Ensure custom roles exist
    await ensureVenueManagerRole({ strapi })

    // Seed a dev super-admin on a fresh DB (no-op if one exists; gated in prod)
    await ensureAdminUser({ strapi })

    // Ensure i18n locales exist (fr is the default, ar is required)
    await ensureI18nLocales({ strapi })
  },
}
