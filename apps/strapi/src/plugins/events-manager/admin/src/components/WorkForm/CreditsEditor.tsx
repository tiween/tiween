/**
 * CreditsEditor
 *
 * Repeatable editor for the creative-works.credit component:
 * person + credit role (required relation) + custom role + billing order.
 * Backed by react-hook-form useFieldArray.
 *
 * Characters are NOT edited here — they belong to the `cast` component
 * (see CastEditor).
 */

import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  IconButton,
  NumberInput,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { Plus, Trash } from "@strapi/icons"
import { Controller, useFieldArray, useWatch } from "react-hook-form"

import type { Control, FieldErrors } from "react-hook-form"
import type { CreditRoleRef } from "../../hooks/useCreativeWorks"
import type { WorkFormValues } from "./schema"

import { useCreditRoles } from "../../hooks/useCreativeWorks"
import { useCatalogT } from "../Catalog/i18n"
import { CreditRoleSelect } from "./CreditRoleSelect"
import { PersonCombobox } from "./PersonCombobox"
import { clampBilling, EMPTY_CREDIT, isGenericCreditRole } from "./schema"

interface CreditsEditorProps {
  control: Control<WorkFormValues>
  errors: FieldErrors<WorkFormValues>
  disabled?: boolean
}

interface CreditRowProps extends CreditsEditorProps {
  index: number
  onRemove: () => void
  creditRoles: CreditRoleRef[]
  isLoadingRoles: boolean
}

function CreditRow({
  control,
  errors,
  disabled,
  index,
  onRemove,
  creditRoles,
  isLoadingRoles,
}: CreditRowProps) {
  const t = useCatalogT()
  const rowErrors = errors.credits?.[index]
  // `customRole` only labels the catch-all role. Showing the input next to a
  // named role invites a contradictory pair ("Director" + "Producer") that
  // workToApiPayload would then have to discard silently.
  const pickedRole = useWatch({
    control,
    name: `credits.${index}.creditRole`,
  })
  const acceptsCustomRole = isGenericCreditRole(pickedRole?.slug)

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
        <Field.Root
          width="100%"
          required
          error={
            rowErrors?.creditRole
              ? t("credits.roleRequired", "Select a role")
              : undefined
          }
        >
          <Field.Label>{t("credits.role", "Role")}</Field.Label>
          <Controller
            control={control}
            name={`credits.${index}.creditRole`}
            render={({ field }) => (
              <CreditRoleSelect
                value={field.value}
                creditRoles={creditRoles}
                isLoading={isLoadingRoles}
                placeholder={t("credits.pickRole", "Pick a role…")}
                onChange={field.onChange}
                hasError={Boolean(rowErrors?.creditRole)}
                disabled={disabled}
              />
            )}
          />
          <Field.Error />
        </Field.Root>
      </Grid.Item>

      <Grid.Item col={3} s={6} alignItems="flex-start">
        <Field.Root
          width="100%"
          required={acceptsCustomRole}
          error={
            rowErrors?.customRole
              ? t(
                  "credits.customRoleRequired",
                  "Name the role — the picked role is the generic one"
                )
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
                disabled={disabled || !acceptsCustomRole}
              />
            )}
          />
          <Field.Hint>
            {acceptsCustomRole
              ? t("credits.customRoleHint", "Name this generic role")
              : t(
                  "credits.customRoleDisabledHint",
                  "Only for the generic role"
                )}
          </Field.Hint>
          <Field.Error />
        </Field.Root>
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
                // Clamped to creditFormSchema's range. Left unclamped, a 0 or a
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
  // Fetched once for the whole editor, not once per row.
  const {
    creditRoles,
    isLoading: isLoadingRoles,
    error: rolesError,
  } = useCreditRoles()

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {fields.length === 0 && (
        <Typography variant="omega" textColor="neutral600">
          {t("credits.empty", "No credits yet. Billing sets the crew order.")}
        </Typography>
      )}

      {!isLoadingRoles && creditRoles.length === 0 && (
        <Typography variant="omega" textColor="danger600">
          {rolesError
            ? t(
                "credits.rolesFailed",
                "The credit-role list could not be loaded, so a credit cannot be saved. Check your permissions on Credit Role and retry."
              )
            : t(
                "credits.noRoles",
                "No credit roles are available. A credit cannot be saved until the credit-role vocabulary is populated."
              )}
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
          creditRoles={creditRoles}
          isLoadingRoles={isLoadingRoles}
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
