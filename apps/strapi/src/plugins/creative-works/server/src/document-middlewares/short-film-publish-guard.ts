import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"
import type { ShortFilmRuleInput } from "../../../../../shared/short-film-rules"

import { getShortFilmPublishBypass } from "../../../../../shared/short-film-publish-bypass"
import {
  countryCodesSchema,
  evaluateShortFilmPublishRules,
  languageCodesSchema,
} from "../../../../../shared/short-film-rules"

/** Code carried in `error.details.code` when a short film cannot be published. */
export const SHORT_FILM_PUBLISH_BLOCKED = "SHORT_FILM_PUBLISH_BLOCKED"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"
const PERSON_UID = "plugin::creative-works.person"

/** What the D-19 evaluator reads from the default-locale draft. */
const RULE_POPULATE = {
  poster: true,
  credits: { populate: { creditRole: true, person: true } },
  streamingLinks: true,
  videos: true,
}

interface DocumentContext {
  uid: string
  action: string
  params: Record<string, any>
}

type Next = () => Promise<unknown>

/** The Document Service middleware signature `strapi.documents.use` accepts. */
type DocumentMiddleware = Parameters<Core.Strapi["documents"]["use"]>[0]

/** D-01 / D-02: write validators for the two JSON code lists, in check order. */
const CODE_VALIDATORS = [
  { key: "country", schema: countryCodesSchema, code: "INVALID_COUNTRY_CODES" },
  {
    key: "language",
    schema: languageCodesSchema,
    code: "INVALID_LANGUAGE_CODES",
  },
] as const

/**
 * D-19 publish rules, enforced where every write path converges: the Document
 * Service. Content-manager single publish, bulk publish and releases all call
 * `strapi.documents(uid).publish(...)`, so one middleware covers them. Core
 * `create` / `update` with `status: "published"` publish internally without
 * re-entering the middleware, so the guard rewrites those into a draft write
 * followed by an explicit `publish`, which does re-enter it: one evaluation
 * path for every route.
 *
 * The guard never reads an HTTP request: it only sees the Document Service
 * context and the in-process bypass scope, so nothing outside the process can
 * relax a rule.
 */
export function createShortFilmPublishGuard(
  strapi: Core.Strapi
): DocumentMiddleware {
  const documents = () => strapi.documents(CREATIVE_WORK_UID as any) as any

  async function defaultLocale(): Promise<string> {
    return strapi.plugin("i18n").service("locales").getDefaultLocale()
  }

  /** The draft the rules are evaluated against (default locale first). */
  async function loadRuleSubject(
    documentId: string,
    requestedLocale: unknown
  ): Promise<(ShortFilmRuleInput & { type?: string }) | null> {
    const base = { documentId, status: "draft", populate: RULE_POPULATE }

    let draft = await documents().findOne({
      ...base,
      locale: await defaultLocale(),
    })
    if (
      !draft &&
      typeof requestedLocale === "string" &&
      requestedLocale !== "*"
    ) {
      draft = await documents().findOne({ ...base, locale: requestedLocale })
    }
    return draft ?? null
  }

  async function publishedPersonIds(
    subject: ShortFilmRuleInput
  ): Promise<Set<string>> {
    const ids = (subject.credits ?? [])
      .map((credit) => credit?.person?.documentId)
      .filter((id): id is string => typeof id === "string")
    if (ids.length === 0) return new Set()

    const rows = (await (strapi.documents(PERSON_UID as any) as any).findMany({
      status: "published",
      locale: await defaultLocale(),
      filters: { documentId: { $in: ids } },
      fields: ["documentId"],
    })) as Array<{ documentId: string }>
    return new Set(rows.map((row) => row.documentId))
  }

  async function guardPublish(context: DocumentContext) {
    const documentId = context.params.documentId
    if (typeof documentId !== "string") return

    const subject = await loadRuleSubject(documentId, context.params.locale)
    if (!subject || subject.type !== "short-film") return

    const publishedIds = await publishedPersonIds(subject)
    const bypass = getShortFilmPublishBypass()

    const strict = evaluateShortFilmPublishRules(subject, {
      publishedPersonIds: publishedIds,
    })
    const result = bypass
      ? evaluateShortFilmPublishRules(subject, {
          skip: bypass.skip,
          publishedPersonIds: publishedIds,
        })
      : strict

    for (const warning of result.warnings) {
      strapi.log.warn(
        `[creative-works] short-film publish warning: ${warning.code} documentId=${documentId}`
      )
    }

    if (!result.ok) {
      throw new errors.ValidationError("Short film cannot be published", {
        code: SHORT_FILM_PUBLISH_BLOCKED,
        issues: result.issues,
      })
    }

    if (bypass && strict.issues.some((i) => i.code === "POSTER_REQUIRED")) {
      strapi.log.warn(
        `[creative-works] short-film publish rule bypassed: POSTER_REQUIRED documentId=${documentId} reason=${bypass.reason}`
      )
    }
  }

  /** D-01 / D-02: invalid country or language codes are refused on any write. */
  function validateCodes(data: unknown) {
    if (!data || typeof data !== "object") return

    for (const { key, schema, code } of CODE_VALIDATORS) {
      if (!(key in data)) continue
      if (!schema.safeParse((data as Record<string, unknown>)[key]).success) {
        throw new errors.ValidationError("Invalid creative work data", {
          code,
          issues: [{ code, path: key }],
        })
      }
    }
  }

  /** The work type a create/update will leave behind (short-film or not). */
  async function resolveWriteType(
    context: DocumentContext
  ): Promise<string | undefined> {
    const fromData = context.params.data?.type
    if (typeof fromData === "string") return fromData
    if (context.action !== "update") return undefined

    const documentId = context.params.documentId
    if (typeof documentId !== "string") return undefined
    const existing = await documents().findOne({
      documentId,
      locale: await defaultLocale(),
      status: "draft",
      fields: ["type"],
    })
    return existing?.type
  }

  async function guardWrite(context: DocumentContext, next: Next) {
    validateCodes(context.params.data)

    if (context.params.status !== "published") return next()
    if ((await resolveWriteType(context)) !== "short-film") return next()

    // Draft write first (a block keeps the draft: draft saves stay
    // permissive), then publish through the Document Service so the
    // `publish` branch evaluates the rules.
    const { locale, populate, fields } = context.params
    delete context.params.status
    const written = (await next()) as { documentId?: string } | null
    const documentId =
      context.action === "create"
        ? written?.documentId
        : context.params.documentId
    if (typeof documentId !== "string") return written

    await documents().publish({ documentId, locale })
    return documents().findOne({
      documentId,
      locale,
      status: "published",
      ...(populate ? { populate } : {}),
      ...(fields ? { fields } : {}),
    })
  }

  const middleware = async (context: DocumentContext, next: Next) => {
    if (context.uid !== CREATIVE_WORK_UID) return next()

    switch (context.action) {
      case "publish":
        await guardPublish(context)
        return next()
      case "create":
      case "update":
        return guardWrite(context, next)
      default:
        return next()
    }
  }

  // The loose local context type keeps the guard readable; Strapi's own
  // generic context type cannot be narrowed to one uid here.
  return middleware as unknown as DocumentMiddleware
}
