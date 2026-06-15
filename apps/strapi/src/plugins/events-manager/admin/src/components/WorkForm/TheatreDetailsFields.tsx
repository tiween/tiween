/**
 * TheatreDetailsFields
 *
 * Fields for the creative-works.theatre-details component.
 * Rendered only when the work type is "play".
 */

import {
  DatePicker,
  Field,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectOption,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Toggle,
} from "@strapi/design-system"
import { Controller } from "react-hook-form"

import type { Control } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import { humanize, useCatalogT } from "../Catalog/i18n"
import { PLAY_FORMATS, PLAY_TYPES, THEATRE_LANGUAGES } from "../Catalog/options"
import { VenueSelector } from "../VenueSelector"

interface TheatreDetailsFieldsProps {
  control: Control<WorkFormValues>
  disabled?: boolean
}

const toDateString = (date: Date | undefined) => {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function TheatreDetailsFields({
  control,
  disabled,
}: TheatreDetailsFieldsProps) {
  const t = useCatalogT()

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Grid.Root gap={4}>
        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>{t("theatre.playType", "Play type")}</Field.Label>
            <Controller
              control={control}
              name="theatreDetails.playType"
              render={({ field }) => (
                <SingleSelect
                  value={field.value}
                  onChange={(value) => field.onChange(String(value))}
                  disabled={disabled}
                >
                  {PLAY_TYPES.map((value) => (
                    <SingleSelectOption key={value} value={value}>
                      {t(`playType.${value}`, humanize(value))}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>{t("theatre.format", "Format")}</Field.Label>
            <Controller
              control={control}
              name="theatreDetails.format"
              render={({ field }) => (
                <SingleSelect
                  value={field.value}
                  onChange={(value) => field.onChange(String(value))}
                  disabled={disabled}
                >
                  {PLAY_FORMATS.map((value) => (
                    <SingleSelectOption key={value} value={value}>
                      {t(`playFormat.${value}`, humanize(value))}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>{t("theatre.actCount", "Acts")}</Field.Label>
            <Controller
              control={control}
              name="theatreDetails.actCount"
              render={({ field }) => (
                <NumberInput
                  value={field.value ?? undefined}
                  onValueChange={(value) => field.onChange(value ?? null)}
                  disabled={disabled}
                />
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>
              {t("theatre.originalLanguage", "Original language")}
            </Field.Label>
            <Controller
              control={control}
              name="theatreDetails.originalLanguage"
              render={({ field }) => (
                <SingleSelect
                  value={field.value}
                  onChange={(value) => field.onChange(String(value))}
                  disabled={disabled}
                  placeholder="—"
                >
                  {THEATRE_LANGUAGES.map((value) => (
                    <SingleSelectOption key={value} value={value}>
                      {t(`language.${value}`, humanize(value))}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={6} s={12} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>{t("theatre.basedOn", "Based on")}</Field.Label>
            <Controller
              control={control}
              name="theatreDetails.basedOn"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(event.target.value)
                  }
                  placeholder={t(
                    "theatre.basedOnPlaceholder",
                    "Source work, when adapted"
                  )}
                  disabled={disabled}
                />
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={6} s={12} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>
              {t("theatre.performedLanguages", "Performed languages")}
            </Field.Label>
            <Controller
              control={control}
              name="theatreDetails.performedLanguages"
              render={({ field }) => (
                <MultiSelect
                  value={field.value}
                  onChange={(values) => field.onChange(values)}
                  disabled={disabled}
                  withTags
                >
                  {THEATRE_LANGUAGES.map((value) => (
                    <MultiSelectOption key={value} value={value}>
                      {t(`language.${value}`, humanize(value))}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={6} s={12} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>
              {t("theatre.productionCompany", "Production company")}
            </Field.Label>
            <Controller
              control={control}
              name="theatreDetails.productionCompany"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(event.target.value)
                  }
                  disabled={disabled}
                />
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>
              {t("theatre.premiereDate", "Premiere date")}
            </Field.Label>
            <Controller
              control={control}
              name="theatreDetails.premiereDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(toDateString(date))}
                  onClear={() => field.onChange(null)}
                  disabled={disabled}
                />
              )}
            />
          </Field.Root>
        </Grid.Item>

        <Grid.Item col={3} s={6} alignItems="flex-start">
          <Field.Root width="100%">
            <Field.Label>
              {t("theatre.premiereVenue", "Premiere venue")}
            </Field.Label>
            <Controller
              control={control}
              name="theatreDetails.premiereVenueId"
              render={({ field }) => (
                <VenueSelector
                  value={field.value}
                  onChange={(documentId) => field.onChange(documentId)}
                  disabled={disabled}
                />
              )}
            />
          </Field.Root>
        </Grid.Item>
      </Grid.Root>

      <Flex gap={6}>
        <Controller
          control={control}
          name="theatreDetails.hasIntermission"
          render={({ field }) => (
            <Field.Root>
              <Field.Label>
                {t("theatre.hasIntermission", "Intermission")}
              </Field.Label>
              <Toggle
                onLabel={t("common.yes", "Yes")}
                offLabel={t("common.no", "No")}
                checked={field.value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  field.onChange(event.target.checked)
                }
                disabled={disabled}
              />
            </Field.Root>
          )}
        />
        <Controller
          control={control}
          name="theatreDetails.isTourProduction"
          render={({ field }) => (
            <Field.Root>
              <Field.Label>
                {t("theatre.isTourProduction", "Tour production")}
              </Field.Label>
              <Toggle
                onLabel={t("common.yes", "Yes")}
                offLabel={t("common.no", "No")}
                checked={field.value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  field.onChange(event.target.checked)
                }
                disabled={disabled}
              />
            </Field.Root>
          )}
        />
      </Flex>
    </Flex>
  )
}
