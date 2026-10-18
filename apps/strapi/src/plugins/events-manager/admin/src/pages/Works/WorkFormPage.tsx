/**
 * WorkFormPage
 *
 * Page wrapper around WorkForm for both "new" and "edit" routes.
 * Loads the work when editing, maps form values to the
 * content-manager payload on submit, and (when editing) shows the
 * publish bar for the default locale.
 */

import { useMemo } from "react"
import { Box, Flex, Loader, Main } from "@strapi/design-system"
import { useNotification } from "@strapi/strapi/admin"
import { useNavigate, useParams } from "react-router-dom"

import type { WorkFormValues } from "../../components/WorkForm"

import { evaluateShortFilmPublishRules } from "../../../../../../shared/short-film-rules"
import { useCatalogT } from "../../components/Catalog/i18n"
import { WorkForm } from "../../components/WorkForm"
import { PublishBar } from "../../components/WorkForm/PublishBar"
import {
  extractPublishError,
  isKnownIssueCode,
  publishErrorMessages,
  workToRuleInput,
} from "../../components/WorkForm/publishRules"
import {
  workToApiPayload,
  workToFormValues,
} from "../../components/WorkForm/schema"
import {
  useLocales,
  useWork,
  useWorkMutations,
} from "../../hooks/useCreativeWorks"
import { PLUGIN_ID } from "../../pluginId"

const BASE_PATH = `/plugins/${PLUGIN_ID}/works`

export function WorkFormPage() {
  const t = useCatalogT()
  const navigate = useNavigate()
  const { toggleNotification } = useNotification()
  const { documentId } = useParams<{ documentId: string }>()

  const isEditing = Boolean(documentId)
  const { locales, defaultLocale, isLoading: isLoadingLocales } = useLocales()
  // The request waits for the i18n plugin to name the default locale, so the
  // default row is asked for explicitly and never by a literal code.
  const {
    work,
    isLoading: isLoadingWork,
    refetch,
  } = useWork(
    isEditing && !isLoadingLocales ? documentId ?? null : null,
    defaultLocale
  )
  const {
    createWork,
    updateWork,
    publishWork,
    unpublishWork,
    generateSlug,
    isLoading: isSubmitting,
  } = useWorkMutations()

  /** D-19 pre-check of the saved draft (short films only); advisory. */
  const ruleResult = useMemo(
    () =>
      work?.type === "short-film"
        ? evaluateShortFilmPublishRules(workToRuleInput(work))
        : null,
    [work]
  )

  /** Toast text for a failed request: coded sentences, never raw server text. */
  const failureMessage = (err: unknown, fallback: string) => {
    const parsed = extractPublishError(err)
    return parsed.issues.length > 0 || isKnownIssueCode(parsed.code)
      ? publishErrorMessages(parsed, t).join(". ")
      : fallback
  }

  const handleSubmit = async (values: WorkFormValues) => {
    const payload = workToApiPayload(values)

    try {
      // A published short is reached by its slug, and the server never makes
      // one: ask the content-manager's uid generator when the field is blank.
      if (!values.slug.trim() && values.title.trim()) {
        try {
          payload.slug = await generateSlug(values.title)
        } catch {
          // The draft still saves; the publish rules flag a missing slug.
        }
      }

      if (isEditing && documentId) {
        await updateWork(documentId, payload, defaultLocale ?? undefined)
        await refetch()
        toggleNotification({
          type: "success",
          message: t("workForm.saved", "Work saved"),
        })
        navigate(`${BASE_PATH}/${documentId}`)
      } else {
        const created = await createWork(payload)
        toggleNotification({
          type: "success",
          message: t("workForm.created", "Work created"),
        })
        navigate(`${BASE_PATH}/${created.documentId}`)
      }
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: failureMessage(err, t("common.error", "Something went wrong")),
      })
    }
  }

  const handlePublish = async () => {
    if (!documentId) return
    try {
      await publishWork(documentId, defaultLocale ?? undefined)
      await refetch()
      toggleNotification({
        type: "success",
        message: t("publish.published", "Work published"),
      })
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: failureMessage(
          err,
          t("publish.issue.GENERIC", "Publishing failed")
        ),
      })
    }
  }

  const handleUnpublish = async () => {
    if (!documentId) return
    try {
      await unpublishWork(documentId, defaultLocale ?? undefined)
      await refetch()
      toggleNotification({
        type: "success",
        message: t("publish.unpublished", "Work unpublished"),
      })
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: failureMessage(err, t("common.error", "Something went wrong")),
      })
    }
  }

  if (isEditing && (isLoadingLocales || isLoadingWork)) {
    return (
      <Main>
        <Flex justifyContent="center" padding={8}>
          <Loader>{t("common.loading", "Loading…")}</Loader>
        </Flex>
      </Main>
    )
  }

  const defaultLocaleLabel =
    locales.find((locale) => locale.code === defaultLocale)?.name ??
    defaultLocale ??
    ""

  return (
    <Main>
      {isEditing && work && (
        <Box paddingTop={6} paddingLeft={10} paddingRight={10}>
          <PublishBar
            status={work.status}
            ruleResult={ruleResult}
            localeLabel={defaultLocaleLabel}
            isBusy={isSubmitting}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        </Box>
      )}
      <WorkForm
        key={work?.documentId ?? "new"}
        title={
          isEditing && work ? work.title : t("workForm.newTitle", "New work")
        }
        initialValues={work ? workToFormValues(work) : undefined}
        isSubmitting={isSubmitting}
        backTo={BASE_PATH}
        onSubmit={handleSubmit}
      />
    </Main>
  )
}
