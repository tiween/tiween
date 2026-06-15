/**
 * DistinctionsEditor
 *
 * Repeatable editor for the creative-works.distinction component:
 * festival selections, awards and nominations.
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
import { Controller, useFieldArray } from "react-hook-form"

import type { Control, FieldErrors } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import { humanize, useCatalogT } from "../Catalog/i18n"
import { DISTINCTION_RESULTS } from "../Catalog/options"
import { EMPTY_DISTINCTION } from "./schema"

interface DistinctionsEditorProps {
  control: Control<WorkFormValues>
  errors: FieldErrors<WorkFormValues>
  disabled?: boolean
}

export function DistinctionsEditor({
  control,
  errors,
  disabled,
}: DistinctionsEditorProps) {
  const t = useCatalogT()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "distinctions",
  })

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {fields.length === 0 && (
        <Typography variant="omega" textColor="neutral600">
          {t(
            "distinctions.empty",
            "Festival selections, awards and nominations."
          )}
        </Typography>
      )}

      {fields.map((field, index) => {
        const rowErrors = errors.distinctions?.[index]

        return (
          <Box
            key={field.id}
            hasRadius
            borderColor="neutral200"
            borderStyle="solid"
            borderWidth="1px"
            padding={4}
          >
            <Grid.Root gap={2}>
              <Grid.Item col={5} s={12} alignItems="flex-start">
                <Field.Root
                  width="100%"
                  required
                  error={
                    rowErrors?.name
                      ? t("distinctions.nameRequired", "Name is required")
                      : undefined
                  }
                >
                  <Field.Label>
                    {t("distinctions.name", "Festival or award")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.name`}
                    render={({ field: input }) => (
                      <TextInput
                        value={input.value}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => input.onChange(event.target.value)}
                        hasError={Boolean(rowErrors?.name)}
                        disabled={disabled}
                      />
                    )}
                  />
                  <Field.Error />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={2} s={4} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>
                    {t("distinctions.edition", "Edition")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.edition`}
                    render={({ field: input }) => (
                      <TextInput
                        value={input.value}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => input.onChange(event.target.value)}
                        disabled={disabled}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={2} s={4} alignItems="flex-start">
                <Field.Root width="100%" required>
                  <Field.Label>{t("distinctions.year", "Year")}</Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.year`}
                    render={({ field: input }) => (
                      <NumberInput
                        value={input.value}
                        onValueChange={(value) =>
                          input.onChange(value ?? EMPTY_DISTINCTION.year)
                        }
                        disabled={disabled}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={2} s={4} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>
                    {t("distinctions.result", "Result")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.result`}
                    render={({ field: input }) => (
                      <SingleSelect
                        value={input.value}
                        onChange={(value) => input.onChange(String(value))}
                        disabled={disabled}
                      >
                        {DISTINCTION_RESULTS.map((result) => (
                          <SingleSelectOption key={result} value={result}>
                            {t(`result.${result}`, humanize(result))}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    )}
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={1} s={2} alignItems="flex-end">
                <Box paddingBottom={1}>
                  <IconButton
                    label={t("distinctions.remove", "Remove distinction")}
                    onClick={() => remove(index)}
                    disabled={disabled}
                    variant="ghost"
                  >
                    <Trash />
                  </IconButton>
                </Box>
              </Grid.Item>

              <Grid.Item col={4} s={6} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>
                    {t("distinctions.section", "Section")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.section`}
                    render={({ field: input }) => (
                      <TextInput
                        value={input.value}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => input.onChange(event.target.value)}
                        disabled={disabled}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={4} s={6} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>
                    {t("distinctions.category", "Category")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.category`}
                    render={({ field: input }) => (
                      <TextInput
                        value={input.value}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => input.onChange(event.target.value)}
                        disabled={disabled}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={4} s={12} alignItems="flex-start">
                <Field.Root width="100%">
                  <Field.Label>
                    {t("distinctions.awardName", "Award name")}
                  </Field.Label>
                  <Controller
                    control={control}
                    name={`distinctions.${index}.awardName`}
                    render={({ field: input }) => (
                      <TextInput
                        value={input.value}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => input.onChange(event.target.value)}
                        disabled={disabled}
                      />
                    )}
                  />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          </Box>
        )
      })}

      <Box>
        <Button
          variant="secondary"
          startIcon={<Plus />}
          onClick={() => append({ ...EMPTY_DISTINCTION })}
          disabled={disabled}
        >
          {t("distinctions.add", "Add a distinction")}
        </Button>
      </Box>
    </Flex>
  )
}
