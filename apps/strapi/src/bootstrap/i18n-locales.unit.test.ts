/**
 * Unit tests for `ensureI18nLocales`: fr (default), ar and en must exist after
 * boot, the loop must be idempotent and "fr" must stay the default locale.
 */
import { ensureI18nLocales } from "./i18n-locales"

type LocaleCode = "fr" | "ar" | "en"

function buildStrapi({
  existing,
  defaultLocale,
}: {
  existing: LocaleCode[]
  defaultLocale: string
}) {
  const findByCode = jest.fn(async (code: string) =>
    existing.includes(code as LocaleCode) ? { code } : null
  )
  const create = jest.fn(async (data: { code: string; name: string }) => data)
  const getDefaultLocale = jest.fn(async () => defaultLocale)
  const setDefaultLocale = jest.fn(async () => undefined)
  const strapi = {
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({
        findByCode,
        create,
        getDefaultLocale,
        setDefaultLocale,
      })),
    })),
    log: { info: jest.fn(), error: jest.fn() },
  }
  return { strapi, create, setDefaultLocale, findByCode }
}

describe("ensureI18nLocales (unit)", () => {
  it("creates fr, ar and en, in that order, when none exist", async () => {
    const { strapi, create } = buildStrapi({
      existing: [],
      defaultLocale: "fr",
    })

    await ensureI18nLocales({ strapi: strapi as any })

    expect(create.mock.calls.map(([arg]) => arg.code)).toEqual([
      "fr",
      "ar",
      "en",
    ])
    expect(create).toHaveBeenCalledWith({ code: "en", name: "English (en)" })
  })

  it("is idempotent: creates nothing and keeps the default when all exist and fr is default", async () => {
    const { strapi, create, setDefaultLocale } = buildStrapi({
      existing: ["fr", "ar", "en"],
      defaultLocale: "fr",
    })

    await ensureI18nLocales({ strapi: strapi as any })

    expect(create).not.toHaveBeenCalled()
    expect(setDefaultLocale).not.toHaveBeenCalled()
  })

  it("creates only the missing en locale when fr and ar already exist", async () => {
    const { strapi, create } = buildStrapi({
      existing: ["fr", "ar"],
      defaultLocale: "fr",
    })

    await ensureI18nLocales({ strapi: strapi as any })

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({ code: "en", name: "English (en)" })
  })

  it("restores fr as the default locale when another locale is default", async () => {
    const { strapi, setDefaultLocale } = buildStrapi({
      existing: ["fr", "ar", "en"],
      defaultLocale: "en",
    })

    await ensureI18nLocales({ strapi: strapi as any })

    expect(setDefaultLocale).toHaveBeenCalledTimes(1)
    expect(setDefaultLocale).toHaveBeenCalledWith({ code: "fr" })
  })
})
