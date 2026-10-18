import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"
import type { ShortFilmRuleInput } from "../../../../../shared/short-film-rules"

import { evaluateShortFilmPublishRules } from "../../../../../shared/short-film-rules"

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

/**
 * D-19 publish rules, enforced where every write path converges: the Document
 * Service. Content-manager single publish, bulk publish and releases all call
 * `strapi.documents(uid).publish(...)`, so one middleware covers them.
 *
 * The guard never reads an HTTP request: it only sees the Document Service
 * context, so nothing outside the process can influence it.
 */
export function createShortFilmPublishGuard(
  strapi: Core.Strapi
): DocumentMiddleware {
  async function defaultLocale(): Promise<string> {
    return strapi.plugin("i18n").service("locales").getDefaultLocale()
  }

  /** The draft the rules are evaluated against (default locale first). */
  async function loadRuleSubject(
    documentId: string,
    requestedLocale: unknown
  ): Promise<(ShortFilmRuleInput & { type?: string }) | null> {
    const documents = strapi.documents(CREATIVE_WORK_UID as any) as any
    const base = { documentId, status: "draft", populate: RULE_POPULATE }

    const fallbackLocale = await defaultLocale()
    let draft = await documents.findOne({ ...base, locale: fallbackLocale })
    if (
      !draft &&
      typeof requestedLocale === "string" &&
      requestedLocale !== "*"
    ) {
      draft = await documents.findOne({ ...base, locale: requestedLocale })
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

    const result = evaluateShortFilmPublishRules(subject, {
      publishedPersonIds: await publishedPersonIds(subject),
    })

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
  }

  const middleware = async (context: DocumentContext, next: Next) => {
    if (context.uid !== CREATIVE_WORK_UID) return next()

    if (context.action === "publish") {
      await guardPublish(context)
    }

    return next()
  }

  // The loose local context type keeps the guard readable; Strapi's own
  // generic context type cannot be narrowed to one uid here.
  return middleware as unknown as DocumentMiddleware
}
