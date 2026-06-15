import type { Core } from "@strapi/strapi"

/**
 * Ensures the locales required by the cultural events data model exist
 * and that "fr" is the default locale (see config/plugins.ts).
 * Idempotent: existing locales are left untouched.
 */
export async function ensureI18nLocales({ strapi }: { strapi: Core.Strapi }) {
  const DEFAULT_LOCALE = { code: "fr", name: "French (fr)" }
  const REQUIRED_LOCALES = [DEFAULT_LOCALE, { code: "ar", name: "Arabic (ar)" }]

  const localesService = strapi.plugin("i18n").service("locales")

  try {
    for (const locale of REQUIRED_LOCALES) {
      const existing = await localesService.findByCode(locale.code)
      if (existing) {
        strapi.log.info(`i18n locale "${locale.code}" already exists`)
        continue
      }

      await localesService.create({ code: locale.code, name: locale.name })
      strapi.log.info(`Created i18n locale "${locale.code}"`)
    }

    const defaultLocale = await localesService.getDefaultLocale()
    if (defaultLocale !== DEFAULT_LOCALE.code) {
      await localesService.setDefaultLocale({ code: DEFAULT_LOCALE.code })
      strapi.log.info(
        `Changed i18n default locale from "${defaultLocale}" to "${DEFAULT_LOCALE.code}"`
      )
    }
  } catch (error) {
    strapi.log.error("Failed to ensure i18n locales:", error)
    throw error
  }
}
