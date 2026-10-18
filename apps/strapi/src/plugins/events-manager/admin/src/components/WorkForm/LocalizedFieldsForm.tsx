/**
 * LocalizedFieldsForm
 *
 * The translation tabs of the Works form (D-22): only the fields that differ
 * per language (title, synopsis, poster). Everything else on a work is shared
 * across languages and edited on the default tab, so a translation save can
 * never overwrite structural data (T-01-28).
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { PaperPlane } from "@strapi/icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import type { CreativeWork } from "../../hooks/useCreativeWorks"
import type { MediaAsset } from "../MediaInput"

import { useCatalogT } from "../Catalog/i18n"
import { MediaInput } from "../MediaInput"

const localizedSchema = z.object({
  title: z.string().trim().min(1),
  synopsis: z.string(),
  poster: z
    .custom<MediaAsset>((value) =>
      Boolean(value && typeof value === "object" && "url" in value)
    )
    .nullable(),
})

export type LocalizedFormValues = z.infer<typeof localizedSchema>

/**
 * Form values for a translation tab. An existing row supplies its own values;
 * a missing row starts empty except for the poster, which is prefilled from the
 * default language (the poster id is replicated across languages and the public
 * API still falls back to the default-language poster at read time).
 */
export function toLocalizedValues(
  row: CreativeWork | null,
  defaultRow: CreativeWork | null
): LocalizedFormValues {
  if (row) {
    return {
      title: row.title ?? "",
      synopsis: row.synopsis ?? "",
      poster: row.poster ?? null,
    }
  }
  return { title: "", synopsis: "", poster: defaultRow?.poster ?? null }
}

/** The request body of a translation save: exactly the localized fields. */
export function toLocalizedPayload(values: LocalizedFormValues) {
  return {
    title: values.title.trim(),
    synopsis: values.synopsis.trim() === "" ? null : values.synopsis,
    poster: values.poster?.id ?? null,
  }
}

interface LocalizedFieldsFormProps {
  initialValues: LocalizedFormValues
  /** Title in the default language, shown as a hint only */
  defaultTitle: string
  /** True when this language has no row yet; saving creates it */
  isNewTranslation: boolean
  isSubmitting: boolean
  onSubmit: (values: LocalizedFormValues) => Promise<void> | void
}

export function LocalizedFieldsForm({
  initialValues,
  defaultTitle,
  isNewTranslation,
  isSubmitting,
  onSubmit,
}: LocalizedFieldsFormProps) {
  const t = useCatalogT()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LocalizedFormValues>({
    resolver: zodResolver(localizedSchema),
    defaultValues: initialValues,
  })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
      <Box
        background="neutral0"
        hasRadius
        shadow="filterShadow"
        padding={6}
        marginBottom={4}
      >
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
          <Box>
            <Typography variant="delta" tag="h2">
              {t("localized.title", "Translation")}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                {isNewTranslation
                  ? t(
                      "localized.newHint",
                      "This language has no translation yet. Saving creates it, starting from the default-language poster."
                    )
                  : t(
                      "localized.hint",
                      "Only the title, synopsis and poster change per language. Everything else is edited on the default tab."
                    )}
              </Typography>
            </Box>
          </Box>
          <Button
            type="submit"
            startIcon={<PaperPlane />}
            loading={isSubmitting}
          >
            {t("common.save", "Save")}
          </Button>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
          <Field.Root
            required
            hint={`${t("localized.titleHint", "Default language title")}: ${defaultTitle}`}
            error={
              errors.title
                ? t("workForm.titleRequired", "Title is required")
                : undefined
            }
          >
            <Field.Label>{t("workForm.title", "Title")}</Field.Label>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(event.target.value)
                  }
                  hasError={Boolean(errors.title)}
                />
              )}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>

          <Field.Root>
            <Field.Label>{t("workForm.synopsis", "Synopsis")}</Field.Label>
            <Controller
              control={control}
              name="synopsis"
              render={({ field }) => (
                <Textarea
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    field.onChange(event.target.value)
                  }
                />
              )}
            />
          </Field.Root>

          <Controller
            control={control}
            name="poster"
            render={({ field }) => (
              <Box width="100%">
                <MediaInput
                  label={t("workForm.poster", "Poster")}
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(Array.isArray(value) ? value[0] : value)
                  }
                />
              </Box>
            )}
          />
        </Flex>
      </Box>
    </form>
  )
}
