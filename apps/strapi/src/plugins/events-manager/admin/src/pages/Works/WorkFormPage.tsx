/**
 * WorkFormPage
 *
 * Page wrapper around WorkForm for both "new" and "edit" routes.
 * Loads the work when editing, maps form values to the
 * content-manager payload on submit, and (when editing) shows a
 * publish bar. Locale tabs (D-22): the default language edits the full
 * form; the other languages edit only title, synopsis and poster.
 */

import { useMemo, useState } from "react"
import { Box, Flex, Loader, Main } from "@strapi/design-system"
import { useNotification } from "@strapi/strapi/admin"
import { useNavigate, useParams } from "react-router-dom"

import type { WorkFormValues } from "../../components/WorkForm"
import type { LocaleTabStatus } from "../../components/WorkForm/LocaleTabs"
import type { LocalizedFormValues } from "../../components/WorkForm/LocalizedFieldsForm"

import { evaluateShortFilmPublishRules } from "../../../../../../shared/short-film-rules"
import { useCatalogT } from "../../components/Catalog/i18n"
import { WorkForm } from "../../components/WorkForm"
import { LocaleTabs } from "../../components/WorkForm/LocaleTabs"
import {
  LocalizedFieldsForm,
  toLocalizedPayload,
  toLocalizedValues,
} from "../../components/WorkForm/LocalizedFieldsForm"
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

/** Horizontal padding that lines page chrome up with `Layouts.Content` */
const PAGE_GUTTER = 10

export function WorkFormPage() {
  const t = useCatalogT()
  const navigate = useNavigate()
  const { toggleNotification } = useNotification()
  const { documentId } = useParams<{ documentId: string }>()

  const isEditing = Boolean(documentId)
  const { locales, defaultLocale, isLoading: isLoadingLocales } = useLocales()
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null)
  const activeLocale = selectedLocale ?? defaultLocale
  const isDefaultTab = !activeLocale || activeLocale === defaultLocale

  // The request waits for the i18n plugin to name the default locale, so the
  // default row is asked for explicitly and never by a literal code.
  const {
    work,
    meta,
    isLoading: isLoadingWork,
    refetch: refetchDefault,
  } = useWork(
    isEditing && !isLoadingLocales ? documentId ?? null : null,
    defaultLocale
  )
  // The translation row of the active tab (`work: null` = no row yet).
  const translation = useWork(
    isEditing && !isDefaultTab ? documentId ?? null : null,
    isDefaultTab ? null : activeLocale
  )
  const {
    createWork,
    updateWork,
    publishWork,
    unpublishWork,
    generateSlug,
    ensureTranslationTargets,
    isLoading: isSubmitting,
  } = useWorkMutations()

  const refetchAll = async () => {
    await Promise.all([refetchDefault(), translation.refetch()])
  }

  /**
   * D-19 pre-check of the saved default-language draft (short films only). The
   * server guard evaluates that draft whichever language is published, so a
   * translation tab shows the same list. Advisory: the server decides.
   */
  const ruleResult = useMemo(
    () =>
      work?.type === "short-film"
        ? evaluateShortFilmPublishRules(workToRuleInput(work))
        : null,
    [work]
  )

  const statuses = useMemo(() => {
    const result: Record<string, LocaleTabStatus> = {}
    for (const locale of locales) {
      if (locale.isDefault) {
        result[locale.code] = work?.status ?? "draft"
      } else if (locale.code === activeLocale && !translation.isLoading) {
        result[locale.code] = translation.work?.status ?? "missing"
      } else {
        result[locale.code] =
          meta?.availableLocales?.find((row) => row.locale === locale.code)
            ?.status ?? "missing"
      }
    }
    return result
  }, [
    locales,
    work,
    meta,
    activeLocale,
    translation.isLoading,
    translation.work,
  ])

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
        await refetchAll()
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

  const handleTranslationSubmit = async (values: LocalizedFormValues) => {
    if (!documentId || !activeLocale || !work) return

    try {
      // Creating the first row of a language copies the work's credits and
      // cast, whose people, roles and characters need a row in that language.
      if (!translation.work) {
        await ensureTranslationTargets(work, activeLocale)
      }
      await updateWork(documentId, toLocalizedPayload(values), activeLocale)
      await refetchAll()
      toggleNotification({
        type: "success",
        message: t("localized.saved", "Translation saved"),
      })
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
      await publishWork(documentId, activeLocale ?? undefined)
      await refetchAll()
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
      await unpublishWork(documentId, activeLocale ?? undefined)
      await refetchAll()
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

  const activeRow = isDefaultTab ? work : translation.work
  const activeLocaleLabel =
    locales.find((locale) => locale.code === activeLocale)?.name ??
    activeLocale ??
    ""

  return (
    <Main>
      {locales.length > 1 && activeLocale && (
        <Box
          paddingTop={6}
          paddingLeft={PAGE_GUTTER}
          paddingRight={PAGE_GUTTER}
        >
          <LocaleTabs
            locales={locales}
            value={activeLocale}
            statuses={statuses}
            disableTranslations={!isEditing}
            onChange={setSelectedLocale}
          />
        </Box>
      )}

      {isEditing && activeRow && (
        <Box
          paddingTop={6}
          paddingLeft={PAGE_GUTTER}
          paddingRight={PAGE_GUTTER}
        >
          <PublishBar
            status={activeRow.status}
            ruleResult={ruleResult}
            localeLabel={activeLocaleLabel}
            rulesOnDefaultLanguage={!isDefaultTab}
            isBusy={isSubmitting}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        </Box>
      )}

      {isDefaultTab ? (
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
      ) : translation.isLoading ? (
        <Flex justifyContent="center" padding={8}>
          <Loader>{t("common.loading", "Loading…")}</Loader>
        </Flex>
      ) : (
        <Box
          paddingTop={6}
          paddingLeft={PAGE_GUTTER}
          paddingRight={PAGE_GUTTER}
        >
          <LocalizedFieldsForm
            key={`${activeLocale}-${
              translation.work ? translation.work.updatedAt ?? "row" : "new"
            }`}
            initialValues={toLocalizedValues(translation.work, work)}
            defaultTitle={work?.title ?? ""}
            isNewTranslation={!translation.work}
            isSubmitting={isSubmitting}
            onSubmit={handleTranslationSubmit}
          />
        </Box>
      )}
    </Main>
  )
}
