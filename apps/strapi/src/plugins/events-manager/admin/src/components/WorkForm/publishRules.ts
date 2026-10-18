/**
 * Publish helpers for the Works form (plan 01-09, D-19 form side, D-22).
 *
 * Pure and React-free so the unit gate can import it (the unit gate cannot
 * resolve `@strapi/strapi/admin`). Three jobs:
 *
 * - `workToRuleInput` adapts a content-manager work to the shared evaluator the
 *   server publish guard uses, so the form pre-check and the server verdict
 *   cannot drift.
 * - `extractPublishError` reads the coded error body of a refused request.
 * - `publishIssueMessage` turns a CODE into a translated sentence. The server
 *   never sends prose the admin should show, only codes.
 */

// Six `../` climb from WorkForm/ to `src/` (same import as schema.ts).
import type { ShortFilmRuleInput } from "../../../../../../shared/short-film-rules"
import type { CreativeWork } from "../../hooks/useCreativeWorks"

/** Translate helper shape of `useCatalogT`: (key, default message) => string */
export type Translate = (id: string, defaultMessage: string) => string

export interface PublishIssue {
  code: string
  path?: string
}

export interface PublishError {
  /** `error.details.code`, or a code derived from a known server message */
  code?: string
  issues: PublishIssue[]
}

/** Strapi's message when a locale row (or a target of its copy) is missing. */
const LOCALE_NOT_FOUND = /locale "[^"]+" not found/i

/** Code raised client-side for the missing-translation-target response. */
export const TRANSLATION_TARGET_MISSING = "TRANSLATION_TARGET_MISSING"

/**
 * Adapt a content-manager work to the evaluator input. The evaluator reads the
 * credit-role SLUG and person documentId, never display names.
 */
export function workToRuleInput(work: CreativeWork): ShortFilmRuleInput {
  return {
    slug: work.slug ?? null,
    poster: work.poster ?? null,
    credits: (work.credits ?? []).map((credit) => ({
      creditRole: credit.creditRole
        ? { slug: credit.creditRole.slug ?? null }
        : null,
      person: credit.person ? { documentId: credit.person.documentId } : null,
    })),
    streamingLinks: work.streamingLinks ?? [],
    videos: (work.videos ?? []).map((video) => ({
      videoType: video.videoType ?? null,
    })),
    duration: work.duration ?? null,
  }
}

/**
 * Read the coded body of a failed request. `useFetchClient` rejects with an
 * error whose `response.data.error` is the server body. A response without a
 * code is recognised by Strapi's "locale ... not found" message so the admin
 * can show a clear sentence instead of the raw text; the message itself is
 * never returned.
 */
export function extractPublishError(err: unknown): PublishError {
  const body = (
    err as {
      response?: {
        data?: {
          error?: {
            message?: unknown
            details?: { code?: unknown; issues?: unknown }
          }
        }
      }
    } | null
  )?.response?.data?.error

  const details = body?.details
  const code = typeof details?.code === "string" ? details.code : undefined

  const issues: PublishIssue[] = Array.isArray(details?.issues)
    ? (details.issues as unknown[]).flatMap((issue) => {
        const candidate = issue as { code?: unknown; path?: unknown } | null
        return typeof candidate?.code === "string"
          ? [
              {
                code: candidate.code,
                ...(typeof candidate.path === "string"
                  ? { path: candidate.path }
                  : {}),
              },
            ]
          : []
      })
    : []

  if (
    !code &&
    typeof body?.message === "string" &&
    LOCALE_NOT_FOUND.test(body.message)
  ) {
    return { code: TRANSLATION_TARGET_MISSING, issues }
  }

  return { code, issues }
}

/** Default (English) sentence per code; the catalog key is `publish.issue.<CODE>` */
const ISSUE_DEFAULTS: Record<string, string> = {
  SLUG_REQUIRED: "Add a slug before publishing",
  SLUG_RESERVED: "This slug is reserved, choose another one",
  POSTER_REQUIRED: "Add a poster before publishing",
  DIRECTOR_REQUIRED: "Add at least one director credit",
  DIRECTOR_UNPUBLISHED: "Publish the director's person record first",
  WATCH_SOURCE_REQUIRED: "Add a streaming link or a trailer video",
  INVALID_COUNTRY_CODES: "One of the countries is not a valid ISO code",
  INVALID_LANGUAGE_CODES: "One of the languages is not in the list",
  INVALID_STREAMING_URL: "A streaming link must start with https://",
  DURATION_OVER_40_MINUTES:
    "Longer than 40 minutes: check this is a short film",
  SHORT_FILM_PUBLISH_BLOCKED: "This short film cannot be published yet",
  [TRANSLATION_TARGET_MISSING]:
    "The people, roles or characters credited on this work have no entry in this language yet. Save the translation again; if it keeps failing, translate them first in the Content Manager",
}

const GENERIC_PUBLISH_FAILURE = "Publishing failed"

/** True when the code has a dedicated sentence (not the generic fallback). */
export function isKnownIssueCode(code: string | undefined): boolean {
  return code !== undefined && code in ISSUE_DEFAULTS
}

/** The translated sentence for one issue or error code. */
export function publishIssueMessage(
  code: string | undefined,
  t: Translate
): string {
  const known = code ? ISSUE_DEFAULTS[code] : undefined
  if (!code || known === undefined) {
    return t("publish.issue.GENERIC", GENERIC_PUBLISH_FAILURE)
  }
  return t(`publish.issue.${code}`, known)
}

/**
 * The sentences shown when a request is refused: one per coded issue, or one
 * for `details.code` when the server sent no issues. Never raw server text.
 */
export function publishErrorMessages(
  error: PublishError,
  t: Translate
): string[] {
  const codes =
    error.issues.length > 0
      ? error.issues.map((issue) => issue.code)
      : [error.code]
  return [...new Set(codes.map((code) => publishIssueMessage(code, t)))]
}
