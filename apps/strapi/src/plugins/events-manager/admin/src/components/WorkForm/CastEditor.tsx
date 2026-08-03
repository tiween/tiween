/**
 * CastEditor
 *
 * Repeatable editor for the creative-works.cast component:
 * person (required) + character (optional relation) + billing order.
 * Backed by react-hook-form useFieldArray.
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  IconButton,
  NumberInput,
  Typography,
} from "@strapi/design-system"
import { Plus, Trash } from "@strapi/icons"
import { Controller, useFieldArray } from "react-hook-form"

import type { Control, FieldErrors } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import { useCatalogT } from "../Catalog/i18n"
import { CharacterCombobox } from "./CharacterCombobox"
import { PersonCombobox } from "./PersonCombobox"
import { clampBilling, EMPTY_CAST } from "./schema"

interface CastEditorProps {
  control: Control<WorkFormValues>
  errors: FieldErrors<WorkFormValues>
  disabled?: boolean
}

interface CastRowProps extends CastEditorProps {
  index: number
  onRemove: () => void
}

function CastRow({ control, errors, disabled, index, onRemove }: CastRowProps) {
  const t = useCatalogT()
  const rowErrors = errors.cast?.[index]

  return (
    <Grid.Root gap={2}>
      <Grid.Item col={5} s={12} alignItems="flex-start">
        <Field.Root
          width="100%"
          required
          error={
            rowErrors?.person
              ? t("cast.personRequired", "Select a person")
              : undefined
          }
        >
          <Field.Label>{t("cast.person", "Actor")}</Field.Label>
          <Controller
            control={control}
            name={`cast.${index}.person`}
            render={({ field }) => (
              <PersonCombobox
                value={field.value}
                onChange={field.onChange}
                hasError={Boolean(rowErrors?.person)}
                disabled={disabled}
              />
            )}
          />
          <Field.Error />
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={5} s={10} alignItems="flex-start">
        <Field.Root width="100%">
          <Field.Label>{t("cast.character", "Character")}</Field.Label>
          <Controller
            control={control}
            name={`cast.${index}.character`}
            render={({ field }) => (
              <CharacterCombobox
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
          <Field.Hint>{t("cast.characterHint", "Optional")}</Field.Hint>
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={1} s={4} alignItems="flex-start">
        <Field.Root width="100%">
          <Field.Label>{t("cast.billing", "Order")}</Field.Label>
          <Controller
            control={control}
            name={`cast.${index}.billing`}
            render={({ field }) => (
              <NumberInput
                value={field.value}
                // Clamped to castFormSchema's range. Left unclamped, a 0 or a
                // four-digit order blocks the whole submit with no message —
                // the row renders no error slot for billing. A cleared input
                // keeps the current value rather than snapping to a bound.
                onValueChange={(value) =>
                  field.onChange(clampBilling(value) ?? field.value)
                }
                disabled={disabled}
              />
            )}
          />
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={1} s={2} alignItems="flex-end">
        <Box paddingBottom={1}>
          <IconButton
            label={t("cast.remove", "Remove cast member")}
            onClick={onRemove}
            disabled={disabled}
            variant="ghost"
          >
            <Trash />
          </IconButton>
        </Box>
      </Grid.Item>
    </Grid.Root>
  )
}

export function CastEditor({ control, errors, disabled }: CastEditorProps) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({ control, name: "cast" })

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {fields.length === 0 && (
        <Typography variant="omega" textColor="neutral600">
          {t("cast.empty", "No cast yet. Billing sets the cast order.")}
        </Typography>
      )}

      {fields.map((field, index) => (
        <CastRow
          key={field.id}
          control={control}
          errors={errors}
          disabled={disabled}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}

      <Box>
        <Button
          variant="secondary"
          startIcon={<Plus />}
          onClick={() => append({ ...EMPTY_CAST })}
          disabled={disabled}
        >
          {t("cast.add", "Add a cast member")}
        </Button>
      </Box>
    </Flex>
  )
}
