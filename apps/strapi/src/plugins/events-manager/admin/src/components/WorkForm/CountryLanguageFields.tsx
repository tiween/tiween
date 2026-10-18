/**
 * CountryLanguageFields
 *
 * Searchable country and language pickers for the work form (D-01, D-02,
 * D-18), shown for every work type (D-17).
 *
 * Design System 2.x `MultiSelect` has no filtering and a country list has 249
 * entries, so the multi-select is composed from DS primitives: a searchable
 * `Combobox` that adds the chosen code, and removable `Tag` chips for the
 * selected codes. The code lists and the pinned codes (Tunisia, Tunisian
 * Arabic) come from the shared rules module, so the pickers can only offer
 * what the server validators accept.
 */

import { useMemo, useState } from "react"
import {
  Combobox,
  ComboboxOption,
  Field,
  Flex,
  Grid,
  Tag,
} from "@strapi/design-system"
import { Cross } from "@strapi/icons"
import { Controller } from "react-hook-form"
import { useIntl } from "react-intl"

import type { Control } from "react-hook-form"
import type { WorkFormValues } from "./schema"

import {
  ISO_3166_ALPHA2,
  PINNED_COUNTRY_CODE,
  PINNED_LANGUAGE_CODE,
  SHORT_FILM_LANGUAGE_CODES,
} from "../../../../../../shared/short-film-rules"
import { useCatalogT } from "../Catalog/i18n"

export interface CodeOption {
  code: string
  label: string
}

/** The language that means "no spoken language" and excludes every other. */
const NO_DIALOGUE_CODE = "none"

/**
 * Pinned code first, then the rest sorted by label in the admin locale.
 * Sorting by label (not by code) is what makes a localized list scannable.
 */
export function buildCodeOptions({
  codes,
  pinned,
  labelFor,
  locale,
}: {
  codes: readonly string[]
  pinned?: string
  labelFor: (code: string) => string
  locale: string
}): CodeOption[] {
  const collator = new Intl.Collator(locale)
  const toOption = (code: string): CodeOption => ({
    code,
    label: labelFor(code),
  })

  const rest = codes
    .filter((code) => code !== pinned)
    .map(toOption)
    .sort((a, b) => collator.compare(a.label, b.label))

  return pinned && codes.includes(pinned) ? [toOption(pinned), ...rest] : rest
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase().trim()

/** Matches the typed term against the label or the code, ignoring case and accents. */
export function filterCodeOptions(
  options: readonly CodeOption[],
  term: string
): CodeOption[] {
  const needle = normalize(term)
  if (!needle) {
    return [...options]
  }
  return options.filter(
    (option) =>
      normalize(option.label).includes(needle) ||
      normalize(option.code).includes(needle)
  )
}

/**
 * Selecting an already-selected code is a no-op (same array back). The
 * exclusive code (`none`) replaces the whole selection, and any other code
 * replaces the exclusive one, so the pickers can never build a value the
 * language validator rejects.
 */
export function addCode(
  current: readonly string[],
  code: string,
  exclusiveCode?: string
): string[] {
  if (current.includes(code)) {
    return current as string[]
  }
  if (exclusiveCode && code === exclusiveCode) {
    return [code]
  }
  if (exclusiveCode && current.includes(exclusiveCode)) {
    return [code]
  }
  return [...current, code]
}

export function removeCode(current: readonly string[], code: string): string[] {
  return current.filter((entry) => entry !== code)
}

interface CodeMultiPickerProps {
  label: string
  codes: readonly string[]
  pinned?: string
  value: string[]
  onChange: (next: string[]) => void
  labelFor: (code: string) => string
  exclusiveCode?: string
  placeholder?: string
  removeLabel?: string
  noOptionsMessage?: string
  disabled?: boolean
  error?: string
}

export function CodeMultiPicker({
  label,
  codes,
  pinned,
  value,
  onChange,
  labelFor,
  exclusiveCode,
  placeholder,
  removeLabel = "Remove",
  noOptionsMessage = "No match",
  disabled,
  error,
}: CodeMultiPickerProps) {
  const { locale } = useIntl()
  const [search, setSearch] = useState("")

  const options = useMemo(
    () => buildCodeOptions({ codes, pinned, labelFor, locale }),
    [codes, pinned, labelFor, locale]
  )
  const visible = filterCodeOptions(
    options.filter((option) => !value.includes(option.code)),
    search
  )

  return (
    <Field.Root width="100%" error={error}>
      <Field.Label>{label}</Field.Label>
      <Flex direction="column" alignItems="stretch" gap={2} width="100%">
        <Combobox
          autocomplete="none"
          placeholder={placeholder}
          disabled={disabled}
          hasError={Boolean(error)}
          value=""
          textValue={search}
          onTextValueChange={setSearch}
          noOptionsMessage={() => noOptionsMessage}
          onChange={(code: string) => {
            if (code) {
              onChange(addCode(value, code, exclusiveCode))
              setSearch("")
            }
          }}
        >
          {visible.map((option) => (
            <ComboboxOption key={option.code} value={option.code}>
              {option.label}
            </ComboboxOption>
          ))}
        </Combobox>

        {value.length > 0 && (
          <Flex gap={2} wrap="wrap">
            {value.map((code) => (
              <Tag
                key={code}
                icon={<Cross aria-hidden />}
                label={`${removeLabel} ${labelFor(code)}`}
                disabled={disabled}
                onClick={() => onChange(removeCode(value, code))}
              >
                {labelFor(code)}
              </Tag>
            ))}
          </Flex>
        )}
      </Flex>
      <Field.Error />
    </Field.Root>
  )
}

/** One DisplayNames instance per locale and type: construction is not free. */
const displayNamesCache = new Map<string, Intl.DisplayNames>()

function displayNames(locale: string, type: "region" | "language") {
  const key = `${locale}|${type}`
  let names = displayNamesCache.get(key)
  if (!names) {
    try {
      names = new Intl.DisplayNames([locale], { type })
    } catch {
      // An unsupported admin locale falls back to English names.
      names = new Intl.DisplayNames(["en"], { type })
    }
    displayNamesCache.set(key, names)
  }
  return names
}

const upperFirst = (value: string, locale: string) =>
  value.charAt(0).toLocaleUpperCase(locale) + value.slice(1)

interface CountryLanguageFieldsProps {
  control: Control<WorkFormValues>
  disabled?: boolean
}

export function CountryLanguageFields({
  control,
  disabled,
}: CountryLanguageFieldsProps) {
  const t = useCatalogT()
  const { locale } = useIntl()

  const countryLabel = useMemo(() => {
    const names = displayNames(locale, "region")
    return (code: string) => names.of(code) ?? code
  }, [locale])

  const languageLabel = useMemo(() => {
    const names = displayNames(locale, "language")
    // Intl coverage is uneven for these (research A12), so they are explicit.
    const explicit: Record<string, string> = {
      aeb: t("languages.aeb", "Tunisian Arabic (Derja)"),
      ber: t("languages.ber", "Amazigh"),
      [NO_DIALOGUE_CODE]: t("languages.none", "No dialogue"),
    }
    return (code: string) =>
      explicit[code] ?? upperFirst(names.of(code) ?? code, locale)
  }, [locale, t])

  const removeLabel = t("picker.remove", "Remove")
  const noOptions = t("picker.noMatch", "No match")

  return (
    <Grid.Root gap={4}>
      <Grid.Item col={6} s={12} alignItems="flex-start">
        <Controller
          control={control}
          name="country"
          render={({ field, fieldState }) => (
            <CodeMultiPicker
              label={t("workForm.countries", "Countries")}
              codes={ISO_3166_ALPHA2}
              pinned={PINNED_COUNTRY_CODE}
              value={field.value}
              onChange={field.onChange}
              labelFor={countryLabel}
              placeholder={t(
                "workForm.countriesPlaceholder",
                "Search a country…"
              )}
              removeLabel={removeLabel}
              noOptionsMessage={noOptions}
              disabled={disabled}
              error={
                fieldState.error
                  ? t(
                      "workForm.countriesInvalid",
                      "Select up to 10 countries from the list"
                    )
                  : undefined
              }
            />
          )}
        />
      </Grid.Item>

      <Grid.Item col={6} s={12} alignItems="flex-start">
        <Controller
          control={control}
          name="language"
          render={({ field, fieldState }) => (
            <CodeMultiPicker
              label={t("workForm.languages", "Languages")}
              codes={SHORT_FILM_LANGUAGE_CODES}
              pinned={PINNED_LANGUAGE_CODE}
              value={field.value}
              onChange={field.onChange}
              labelFor={languageLabel}
              exclusiveCode={NO_DIALOGUE_CODE}
              placeholder={t(
                "workForm.languagesPlaceholder",
                "Search a language…"
              )}
              removeLabel={removeLabel}
              noOptionsMessage={noOptions}
              disabled={disabled}
              error={
                fieldState.error
                  ? t(
                      "workForm.languagesInvalid",
                      "Select up to 10 languages. “No dialogue” cannot be combined with another"
                    )
                  : undefined
              }
            />
          )}
        />
      </Grid.Item>
    </Grid.Root>
  )
}
