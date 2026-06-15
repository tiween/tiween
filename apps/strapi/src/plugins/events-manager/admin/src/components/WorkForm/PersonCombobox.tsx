/**
 * PersonCombobox
 *
 * Async search combobox over plugin::creative-works.person,
 * used by the credits editor to pick a person.
 */

import { useState } from "react"
import { Combobox, ComboboxOption } from "@strapi/design-system"
import { useDebounce } from "use-debounce"

import type { PersonRef } from "../../hooks/useCreativeWorks"

import { usePersonSearch } from "../../hooks/useCreativeWorks"
import { useCatalogT } from "../Catalog/i18n"

interface PersonComboboxProps {
  value: PersonRef | null
  onChange: (person: PersonRef | null) => void
  hasError?: boolean
  disabled?: boolean
}

export function PersonCombobox({
  value,
  onChange,
  hasError,
  disabled,
}: PersonComboboxProps) {
  const t = useCatalogT()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm] = useDebounce(searchTerm, 300)
  const { people, isLoading } = usePersonSearch(debouncedTerm)

  // Keep the selected person visible even when the search results change
  const options =
    value && !people.some((person) => person.documentId === value.documentId)
      ? [value, ...people]
      : people

  return (
    <Combobox
      autocomplete="none"
      placeholder={t("credits.searchPerson", "Search a person…")}
      loading={isLoading}
      hasError={hasError}
      disabled={disabled}
      value={value?.documentId ?? ""}
      onTextValueChange={setSearchTerm}
      onChange={(documentId: string) => {
        const person =
          options.find((option) => option.documentId === documentId) ?? null
        onChange(person)
      }}
      onClear={() => {
        setSearchTerm("")
        onChange(null)
      }}
    >
      {options.map((person) => (
        <ComboboxOption key={person.documentId} value={person.documentId}>
          {person.name}
        </ComboboxOption>
      ))}
    </Combobox>
  )
}
