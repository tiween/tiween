/**
 * VideosEditor
 *
 * Repeatable editor for the common.video component (url + type).
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

import { useCatalogT } from "../Catalog/i18n"
import { VIDEO_TYPES } from "../Catalog/options"

const VIDEO_TYPE_LABELS: Record<string, string> = {
  TEASER: "Teaser / trailer",
  CLIP: "Clip",
  FULL_LENGTH: "Full length",
}

interface VideosEditorProps {
  control: Control<WorkFormValues>
  disabled?: boolean
}

export function VideosEditor({ control, disabled }: VideosEditorProps) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({ control, name: "videos" })

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {fields.map((field, index) => (
        <Grid.Root key={field.id} gap={2}>
          <Grid.Item col={7} s={8} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`videos.${index}.url`}
                render={({ field: input, fieldState }) => (
                  <TextInput
                    aria-label={t("videos.url", "Video URL")}
                    placeholder="https://youtu.be/…"
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

          <Grid.Item col={4} s={10} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`videos.${index}.type`}
                render={({ field: input }) => (
                  <SingleSelect
                    aria-label={t("videos.type", "Video type")}
                    value={input.value}
                    onChange={(value) => input.onChange(String(value))}
                    disabled={disabled}
                  >
                    {VIDEO_TYPES.map((value) => (
                      <SingleSelectOption key={value} value={value}>
                        {t(`videoType.${value}`, VIDEO_TYPE_LABELS[value])}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={1} s={2} alignItems="flex-start">
            <IconButton
              label={t("videos.remove", "Remove video")}
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
          onClick={() => append({ url: "", type: "TEASER" })}
          disabled={disabled}
        >
          {t("videos.add", "Add a video")}
        </Button>
      </Box>
    </Flex>
  )
}
