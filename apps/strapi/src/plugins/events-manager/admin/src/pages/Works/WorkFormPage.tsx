/**
 * WorkFormPage
 *
 * Page wrapper around WorkForm for both "new" and "edit" routes.
 * Loads the work when editing, maps form values to the
 * content-manager payload on submit.
 */

import { Flex, Loader, Main } from "@strapi/design-system"
import { useNotification } from "@strapi/strapi/admin"
import { useNavigate, useParams } from "react-router-dom"

import type { WorkFormValues } from "../../components/WorkForm"

import { useCatalogT } from "../../components/Catalog/i18n"
import { WorkForm } from "../../components/WorkForm"
import {
  workToApiPayload,
  workToFormValues,
} from "../../components/WorkForm/schema"
import { useWork, useWorkMutations } from "../../hooks/useCreativeWorks"
import { PLUGIN_ID } from "../../pluginId"

const BASE_PATH = `/plugins/${PLUGIN_ID}/works`

export function WorkFormPage() {
  const t = useCatalogT()
  const navigate = useNavigate()
  const { toggleNotification } = useNotification()
  const { documentId } = useParams<{ documentId: string }>()

  const isEditing = Boolean(documentId)
  const { work, isLoading } = useWork(documentId ?? null)
  const { createWork, updateWork, isLoading: isSubmitting } = useWorkMutations()

  const handleSubmit = async (values: WorkFormValues) => {
    const payload = workToApiPayload(values)

    try {
      if (isEditing && documentId) {
        await updateWork(documentId, payload)
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
    } catch {
      toggleNotification({
        type: "danger",
        message: t("common.error", "Something went wrong"),
      })
    }
  }

  if (isEditing && isLoading) {
    return (
      <Main>
        <Flex justifyContent="center" padding={8}>
          <Loader>{t("common.loading", "Loading…")}</Loader>
        </Flex>
      </Main>
    )
  }

  return (
    <Main>
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
