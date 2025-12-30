import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { routing } from "./navigation"

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (
      await (locale === "fr"
        ? // When using Turbopack, this will enable HMR for default locale `fr`
          import("../../locales/fr.json")
        : import(`../../locales/${locale}.json`))
    ).default,
    timeZone: "Africa/Tunis",
  }
})
