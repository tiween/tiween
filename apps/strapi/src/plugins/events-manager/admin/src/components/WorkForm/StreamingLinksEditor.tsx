/**
 * StreamingLinksEditor
 *
 * Repeatable editor for the creative-works.streaming-link component
 * ("Where to watch", D-03). Rendered only for short films (D-17).
 *
 * Platform and access type come from the shared rules module, the same
 * constants the schema contract test pins against streaming-link.json, so the
 * dropdowns can only offer values the server stores.
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  IconButton,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from "@strapi/design-system"
import { Plus, Trash } from "@strapi/icons"
import { Controller, useFieldArray } from "react-hook-form"

import type { Control } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import {
  STREAMING_ACCESS_TYPES,
  STREAMING_PLATFORMS,
} from "../../../../../../shared/short-film-rules"
import { useCatalogT } from "../Catalog/i18n"
import { EMPTY_STREAMING_LINK } from "./schema"

interface StreamingLinksEditorProps {
  control: Control<WorkFormValues>
  disabled?: boolean
}

const PLATFORM_LABELS: Record<(typeof STREAMING_PLATFORMS)[number], string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  dailymotion: "Dailymotion",
  artify: "Artify",
  arte: "ARTE",
  mubi: "MUBI",
  netflix: "Netflix",
  shahid: "Shahid",
  tv5monde: "TV5MONDEplus",
  other: "Other",
}

const ACCESS_LABELS: Record<(typeof STREAMING_ACCESS_TYPES)[number], string> = {
  free: "Free",
  included: "Included with an account",
  subscription: "Subscription",
  rental: "Rental",
}

export function StreamingLinksEditor({
  control,
  disabled,
}: StreamingLinksEditorProps) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "streamingLinks",
  })

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {fields.map((field, index) => (
        <Grid.Root key={field.id} gap={2}>
          <Grid.Item col={2} s={6} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`streamingLinks.${index}.platform`}
                render={({ field: input }) => (
                  <SingleSelect
                    aria-label={t("streaming.platform", "Platform")}
                    value={input.value}
                    onChange={(value) => input.onChange(String(value))}
                    disabled={disabled}
                  >
                    {STREAMING_PLATFORMS.map((value) => (
                      <SingleSelectOption key={value} value={value}>
                        {t(
                          `streaming.platform.${value}`,
                          PLATFORM_LABELS[value]
                        )}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={4} s={12} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`streamingLinks.${index}.url`}
                render={({ field: input, fieldState }) => (
                  <TextInput
                    aria-label={t("streaming.url", "Watch URL")}
                    placeholder="https://…"
                    value={input.value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      input.onChange(event.target.value)
                    }
                    hasError={Boolean(fieldState.error)}
                    disabled={disabled}
                  />
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={2} s={6} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`streamingLinks.${index}.accessType`}
                render={({ field: input }) => (
                  <SingleSelect
                    aria-label={t("streaming.accessType", "Access")}
                    value={input.value}
                    onChange={(value) => input.onChange(String(value))}
                    disabled={disabled}
                  >
                    {STREAMING_ACCESS_TYPES.map((value) => (
                      <SingleSelectOption key={value} value={value}>
                        {t(`streaming.access.${value}`, ACCESS_LABELS[value])}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={3} s={10} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`streamingLinks.${index}.label`}
                render={({ field: input }) => (
                  <TextInput
                    aria-label={t("streaming.label", "Label (optional)")}
                    placeholder={t("streaming.label", "Label (optional)")}
                    value={input.value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      input.onChange(event.target.value)
                    }
                    disabled={disabled}
                  />
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={1} s={2} alignItems="flex-start">
            <IconButton
              label={t("streaming.remove", "Remove streaming link")}
              onClick={() => remove(index)}
              disabled={disabled}
              variant="ghost"
            >
              <Trash />
            </IconButton>
          </Grid.Item>
        </Grid.Root>
      ))}

      <Box>
        <Button
          variant="secondary"
          startIcon={<Plus />}
          onClick={() => append({ ...EMPTY_STREAMING_LINK })}
          disabled={disabled}
        >
          {t("streaming.add", "Add a streaming link")}
        </Button>
      </Box>
    </Flex>
  )
}
