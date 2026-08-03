/**
 * CharacterCombobox
 *
 * Async search combobox over plugin::creative-works.character,
 * used by the cast editor to link an actor to a character record.
 * Mirrors PersonCombobox.
 */

import { useState } from "react"
import { Combobox, ComboboxOption } from "@strapi/design-system"
import { useDebounce } from "use-debounce"

import type { CharacterRef } from "../../hooks/useCreativeWorks"

import { useCharacterSearch } from "../../hooks/useCreativeWorks"
import { useCatalogT } from "../Catalog/i18n"

interface CharacterComboboxProps {
  value: CharacterRef | null
  onChange: (character: CharacterRef | null) => void
  hasError?: boolean
  disabled?: boolean
}

export function CharacterCombobox({
  value,
  onChange,
  hasError,
  disabled,
}: CharacterComboboxProps) {
  const t = useCatalogT()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm] = useDebounce(searchTerm, 300)
  const { characters, isLoading } = useCharacterSearch(debouncedTerm)

  // Keep the selected character visible even when the search results change
  const options =
    value &&
    !characters.some((character) => character.documentId === value.documentId)
      ? [value, ...characters]
      : characters

  return (
    <Combobox
      autocomplete="none"
      placeholder={t("cast.searchCharacter", "Search a character…")}
      loading={isLoading}
      hasError={hasError}
      disabled={disabled}
      value={value?.documentId ?? ""}
      onTextValueChange={setSearchTerm}
      onChange={(documentId: string) => {
        const character =
          options.find((option) => option.documentId === documentId) ?? null
        onChange(character)
      }}
      onClear={() => {
        setSearchTerm("")
        onChange(null)
      }}
    >
      {options.map((character) => (
        <ComboboxOption key={character.documentId} value={character.documentId}>
          {character.name}
        </ComboboxOption>
      ))}
    </Combobox>
  )
}
