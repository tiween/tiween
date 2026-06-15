/**
 * LinksEditor
 *
 * Generic repeatable editor for the common.link component
 * (type + url + label). Shared by the work and person forms.
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

import type { ArrayPath, Control, FieldValues, Path } from "react-hook-form"

import { humanize, useCatalogT } from "./i18n"
import { LINK_TYPES } from "./options"

interface LinksEditorProps<T extends FieldValues> {
  control: Control<T>
  name: ArrayPath<T>
  disabled?: boolean
}

export function LinksEditor<T extends FieldValues>({
  control,
  name,
  disabled,
}: LinksEditorProps<T>) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({ control, name })

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {fields.map((field, index) => (
        <Grid.Root key={field.id} gap={2}>
          <Grid.Item col={3} s={4} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`${name}.${index}.type` as Path<T>}
                render={({ field: input }) => (
                  <SingleSelect
                    aria-label={t("links.type", "Link type")}
                    value={input.value}
                    onChange={(value) => input.onChange(String(value))}
                    disabled={disabled}
                  >
                    {LINK_TYPES.map((value) => (
                      <SingleSelectOption key={value} value={value}>
                        {t(`linkType.${value}`, humanize(value))}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              />
            </Field.Root>
          </Grid.Item>

          <Grid.Item col={5} s={8} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`${name}.${index}.url` as Path<T>}
                render={({ field: input, fieldState }) => (
                  <TextInput
                    aria-label={t("links.url", "URL")}
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

          <Grid.Item col={3} s={10} alignItems="flex-start">
            <Field.Root width="100%">
              <Controller
                control={control}
                name={`${name}.${index}.label` as Path<T>}
                render={({ field: input }) => (
                  <TextInput
                    aria-label={t("links.label", "Label")}
                    placeholder={t("links.label", "Label")}
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
              label={t("links.remove", "Remove link")}
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
          onClick={() =>
            append({ type: "website", url: "", label: "" } as never)
          }
          disabled={disabled}
        >
          {t("links.add", "Add a link")}
        </Button>
      </Box>
    </Flex>
  )
}
