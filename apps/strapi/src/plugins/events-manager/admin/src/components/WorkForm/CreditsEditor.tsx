/**
 * CreditsEditor
 *
 * Repeatable editor for the creative-works.credit component:
 * person + role + character (cast only) + custom role (other only)
 * + billing order. Backed by react-hook-form useFieldArray.
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  IconButton,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { Plus, Trash } from "@strapi/icons"
import { Controller, useFieldArray, useWatch } from "react-hook-form"

import type { Control, FieldErrors } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import { humanize, useCatalogT } from "../Catalog/i18n"
import { CREDIT_ROLES } from "../Catalog/options"
import { PersonCombobox } from "./PersonCombobox"
import { EMPTY_CREDIT } from "./schema"

interface CreditsEditorProps {
  control: Control<WorkFormValues>
  errors: FieldErrors<WorkFormValues>
  disabled?: boolean
}

interface CreditRowProps extends CreditsEditorProps {
  index: number
  onRemove: () => void
}

function CreditRow({
  control,
  errors,
  disabled,
  index,
  onRemove,
}: CreditRowProps) {
  const t = useCatalogT()
  const role = useWatch({ control, name: `credits.${index}.role` })
  const rowErrors = errors.credits?.[index]

  return (
    <Grid.Root gap={2}>
      <Grid.Item col={4} s={12} alignItems="flex-start">
        <Field.Root
          width="100%"
          error={
            rowErrors?.person
              ? t("credits.personRequired", "Select a person")
              : undefined
          }
        >
          <Field.Label>{t("credits.person", "Person")}</Field.Label>
          <Controller
            control={control}
            name={`credits.${index}.person`}
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

      <Grid.Item col={3} s={6} alignItems="flex-start">
        <Field.Root width="100%">
          <Field.Label>{t("credits.role", "Role")}</Field.Label>
          <Controller
            control={control}
            name={`credits.${index}.role`}
            render={({ field }) => (
              <SingleSelect
                value={field.value}
                onChange={(value) => field.onChange(String(value))}
                disabled={disabled}
              >
                {CREDIT_ROLES.map((roleValue) => (
                  <SingleSelectOption key={roleValue} value={roleValue}>
                    {t(`role.${roleValue}`, humanize(roleValue))}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            )}
          />
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={3} s={6} alignItems="flex-start">
        {role === "other" ? (
          <Field.Root
            width="100%"
            error={
              rowErrors?.customRole
                ? t("credits.customRoleRequired", "Specify the role")
                : undefined
            }
          >
            <Field.Label>{t("credits.customRole", "Custom role")}</Field.Label>
            <Controller
              control={control}
              name={`credits.${index}.customRole`}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(event.target.value)
                  }
                  hasError={Boolean(rowErrors?.customRole)}
                  disabled={disabled}
                />
              )}
            />
            <Field.Error />
          </Field.Root>
        ) : (
          <Field.Root width="100%">
            <Field.Label>{t("credits.character", "Character")}</Field.Label>
            <Controller
              control={control}
              name={`credits.${index}.character`}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(event.target.value)
                  }
                  placeholder={role === "cast" ? "" : "—"}
                  disabled={disabled || role !== "cast"}
                />
              )}
            />
            <Field.Hint>
              {role === "cast"
                ? t("credits.characterHint", "Cast roles only")
                : ""}
            </Field.Hint>
          </Field.Root>
        )}
      </Grid.Item>

      <Grid.Item col={1} s={4} alignItems="flex-start">
        <Field.Root width="100%">
          <Field.Label>{t("credits.billing", "Order")}</Field.Label>
          <Controller
            control={control}
            name={`credits.${index}.billing`}
            render={({ field }) => (
              <NumberInput
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? 99)}
                disabled={disabled}
              />
            )}
          />
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={1} s={2} alignItems="flex-end">
        <Box paddingBottom={1}>
          <IconButton
            label={t("credits.remove", "Remove credit")}
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

export function CreditsEditor({
  control,
  errors,
  disabled,
}: CreditsEditorProps) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({ control, name: "credits" })

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {fields.length === 0 && (
        <Typography variant="omega" textColor="neutral600">
          {t("credits.empty", "No credits yet. Billing sets the cast order.")}
        </Typography>
      )}

      {fields.map((field, index) => (
        <CreditRow
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
          onClick={() => append({ ...EMPTY_CREDIT })}
          disabled={disabled}
        >
          {t("credits.add", "Add a credit")}
        </Button>
      </Box>
    </Flex>
  )
}
