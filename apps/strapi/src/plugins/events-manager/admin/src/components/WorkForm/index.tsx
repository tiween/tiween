/**
 * WorkForm
 *
 * Create / edit form for plugin::creative-works.creative-work.
 * One adaptive form for films, short films and plays: the type
 * selector drives which sections are shown (TMDB ids for cinema,
 * theatre details for plays).
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectOption,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { Film, PaperPlane, Stack } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Link as RouterLink } from "react-router-dom"

import type { ReactNode } from "react"
import type { WorkType } from "../../hooks/useCreativeWorks"
import type { WorkFormValues } from "./schema"

import { useGenres } from "../../hooks/useCreativeWorks"
import { humanize, useCatalogT } from "../Catalog/i18n"
import { LinksEditor } from "../Catalog/LinksEditor"
import { AGE_RATINGS, WORK_TYPES } from "../Catalog/options"
import { MediaInput } from "../MediaInput"
import { CreditsEditor } from "./CreditsEditor"
import { DistinctionsEditor } from "./DistinctionsEditor"
import { DEFAULT_WORK_VALUES, workFormSchema } from "./schema"
import { TheatreDetailsFields } from "./TheatreDetailsFields"
import { VideosEditor } from "./VideosEditor"

interface WorkFormProps {
  initialValues?: WorkFormValues
  title: string
  isSubmitting?: boolean
  backTo: string
  onSubmit: (values: WorkFormValues) => Promise<void> | void
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      padding={6}
      marginBottom={4}
    >
      <Typography variant="delta" tag="h2">
        {title}
      </Typography>
      {hint && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {hint}
          </Typography>
        </Box>
      )}
      <Box paddingTop={4}>{children}</Box>
    </Box>
  )
}

export function WorkForm({
  initialValues,
  title,
  isSubmitting,
  backTo,
  onSubmit,
}: WorkFormProps) {
  const t = useCatalogT()
  const { genres } = useGenres()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkFormValues>({
    resolver: zodResolver(workFormSchema),
    defaultValues: initialValues ?? DEFAULT_WORK_VALUES,
  })

  const workType = watch("type")
  const isPlay = workType === "play"
  const isCinema = !isPlay

  const typeIcon = (type: WorkType) => (type === "play" ? <Stack /> : <Film />)

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
      <Layouts.Header
        title={title}
        subtitle={t(
          "workForm.subtitle",
          "Films, short films and plays of the Tiween catalog"
        )}
        navigationAction={
          <RouterLink to={backTo}>
            <Typography variant="omega" textColor="primary600">
              {t("common.backToList", "Back to list")}
            </Typography>
          </RouterLink>
        }
        primaryAction={
          <Button
            type="submit"
            startIcon={<PaperPlane />}
            loading={isSubmitting}
          >
            {t("common.save", "Save")}
          </Button>
        }
      />

      <Layouts.Content>
        <FormSection
          title={t("workForm.typeSection", "Work type")}
          hint={t(
            "workForm.typeHint",
            "The type drives which sections are shown below."
          )}
        >
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Flex gap={2}>
                {WORK_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={field.value === type ? "default" : "tertiary"}
                    startIcon={typeIcon(type)}
                    onClick={() => field.onChange(type)}
                  >
                    {t(`workType.${type}`, humanize(type))}
                  </Button>
                ))}
              </Flex>
            )}
          />
        </FormSection>

        <FormSection title={t("workForm.identitySection", "Identity")}>
          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12} alignItems="flex-start">
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
            </Grid.Item>

            <Grid.Item col={8} s={12} alignItems="flex-start">
              <Flex
                direction="column"
                alignItems="stretch"
                gap={4}
                width="100%"
              >
                <Field.Root
                  required
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
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => field.onChange(event.target.value)}
                        hasError={Boolean(errors.title)}
                      />
                    )}
                  />
                  <Field.Error />
                </Field.Root>

                <Grid.Root gap={4}>
                  <Grid.Item col={6} s={12} alignItems="flex-start">
                    <Field.Root width="100%">
                      <Field.Label>
                        {t("workForm.originalTitle", "Original title")}
                      </Field.Label>
                      <Controller
                        control={control}
                        name="originalTitle"
                        render={({ field }) => (
                          <TextInput
                            value={field.value}
                            onChange={(
                              event: React.ChangeEvent<HTMLInputElement>
                            ) => field.onChange(event.target.value)}
                          />
                        )}
                      />
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={6} s={12} alignItems="flex-start">
                    <Field.Root width="100%">
                      <Field.Label>{t("workForm.slug", "Slug")}</Field.Label>
                      <Controller
                        control={control}
                        name="slug"
                        render={({ field }) => (
                          <TextInput
                            value={field.value}
                            placeholder={t(
                              "workForm.slugHint",
                              "Generated from the title when empty"
                            )}
                            onChange={(
                              event: React.ChangeEvent<HTMLInputElement>
                            ) => field.onChange(event.target.value)}
                          />
                        )}
                      />
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>

                <Grid.Root gap={4}>
                  <Grid.Item col={4} s={6} alignItems="flex-start">
                    <Field.Root width="100%">
                      <Field.Label>
                        {t("workForm.duration", "Duration (min)")}
                      </Field.Label>
                      <Controller
                        control={control}
                        name="duration"
                        render={({ field }) => (
                          <NumberInput
                            value={field.value ?? undefined}
                            onValueChange={(value) =>
                              field.onChange(value ?? null)
                            }
                          />
                        )}
                      />
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={4} s={6} alignItems="flex-start">
                    <Field.Root width="100%">
                      <Field.Label>
                        {t("workForm.releaseYear", "Release year")}
                      </Field.Label>
                      <Controller
                        control={control}
                        name="releaseYear"
                        render={({ field }) => (
                          <NumberInput
                            value={field.value ?? undefined}
                            onValueChange={(value) =>
                              field.onChange(value ?? null)
                            }
                          />
                        )}
                      />
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={4} s={6} alignItems="flex-start">
                    <Field.Root width="100%">
                      <Field.Label>
                        {t("workForm.ageRating", "Age rating")}
                      </Field.Label>
                      <Controller
                        control={control}
                        name="ageRating"
                        render={({ field }) => (
                          <SingleSelect
                            value={field.value}
                            onChange={(value) => field.onChange(String(value))}
                            onClear={() => setValue("ageRating", "")}
                            placeholder="—"
                          >
                            {AGE_RATINGS.map((rating) => (
                              <SingleSelectOption key={rating} value={rating}>
                                {rating}
                              </SingleSelectOption>
                            ))}
                          </SingleSelect>
                        )}
                      />
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Flex>
            </Grid.Item>

            <Grid.Item col={12} alignItems="flex-start">
              <Field.Root width="100%">
                <Field.Label>{t("workForm.synopsis", "Synopsis")}</Field.Label>
                <Controller
                  control={control}
                  name="synopsis"
                  render={({ field }) => (
                    <Textarea
                      value={field.value}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>
                      ) => field.onChange(event.target.value)}
                    />
                  )}
                />
              </Field.Root>
            </Grid.Item>

            <Grid.Item col={8} s={12} alignItems="flex-start">
              <Field.Root width="100%">
                <Field.Label>{t("workForm.genres", "Genres")}</Field.Label>
                <Controller
                  control={control}
                  name="genreIds"
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value}
                      onChange={(values) => field.onChange(values)}
                      withTags
                      placeholder={t(
                        "workForm.genresPlaceholder",
                        "Pick genres…"
                      )}
                    >
                      {genres.map((genre) => (
                        <MultiSelectOption
                          key={genre.documentId}
                          value={genre.documentId}
                        >
                          {genre.name}
                        </MultiSelectOption>
                      ))}
                    </MultiSelect>
                  )}
                />
              </Field.Root>
            </Grid.Item>

            <Grid.Item col={4} s={6} alignItems="flex-start">
              <Field.Root width="100%">
                <Field.Label>
                  {t("workForm.rating", "Rating (0–10)")}
                </Field.Label>
                <Controller
                  control={control}
                  name="rating"
                  render={({ field }) => (
                    <NumberInput
                      value={field.value ?? undefined}
                      onValueChange={(value) => field.onChange(value ?? null)}
                      step={0.1}
                    />
                  )}
                />
              </Field.Root>
            </Grid.Item>
          </Grid.Root>
        </FormSection>

        <FormSection
          title={t("workForm.creditsSection", "Cast and crew")}
          hint={t(
            "workForm.creditsHint",
            "Each credit links a person to this work with a role."
          )}
        >
          <CreditsEditor control={control} errors={errors} />
        </FormSection>

        {isPlay && (
          <FormSection
            title={t("workForm.theatreSection", "Theatre details")}
            hint={t("workForm.theatreHint", "Play-specific metadata.")}
          >
            <TheatreDetailsFields control={control} />
          </FormSection>
        )}

        <FormSection title={t("workForm.distinctionsSection", "Distinctions")}>
          <DistinctionsEditor control={control} errors={errors} />
        </FormSection>

        <FormSection title={t("workForm.mediaSection", "Media")}>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Controller
              control={control}
              name="backdrop"
              render={({ field }) => (
                <MediaInput
                  label={t("workForm.backdrop", "Backdrop")}
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(Array.isArray(value) ? value[0] : value)
                  }
                />
              )}
            />
            <Controller
              control={control}
              name="photos"
              render={({ field }) => (
                <MediaInput
                  label={t("workForm.photos", "Photos")}
                  multiple
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(
                      value ? (Array.isArray(value) ? value : [value]) : []
                    )
                  }
                />
              )}
            />
            <Box>
              <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                {t("workForm.videos", "Videos")}
              </Typography>
              <Box paddingTop={2}>
                <VideosEditor control={control} />
              </Box>
            </Box>
          </Flex>
        </FormSection>

        <FormSection
          title={t("workForm.externalSection", "External references")}
          hint={
            isCinema
              ? t(
                  "workForm.externalHintCinema",
                  "TMDB / IMDB ids enable sync for films and short films."
                )
              : undefined
          }
        >
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={6} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>TMDB ID</Field.Label>
                  <Controller
                    control={control}
                    name="tmdbId"
                    render={({ field }) => (
                      <NumberInput
                        value={field.value ?? undefined}
                        onValueChange={(value) => field.onChange(value ?? null)}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4} s={6} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>IMDB ID</Field.Label>
                  <Controller
                    control={control}
                    name="imdbId"
                    render={({ field }) => (
                      <TextInput
                        value={field.value}
                        placeholder="tt1234567"
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => field.onChange(event.target.value)}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>

            <Box>
              <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                {t("workForm.links", "Links")}
              </Typography>
              <Box paddingTop={2}>
                <LinksEditor control={control} name="links" />
              </Box>
            </Box>
          </Flex>
        </FormSection>
      </Layouts.Content>
    </form>
  )
}

export type { WorkFormValues }
