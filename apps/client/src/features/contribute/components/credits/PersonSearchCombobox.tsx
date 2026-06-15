"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  User,
} from "lucide-react"

import type { PersonSearchResult } from "../../schemas/person"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { usePersonSearch } from "../../hooks/usePersonSearch"

interface PersonSearchComboboxProps {
  value: string
  onChange: (person: { documentId?: string; name: string } | null) => void
  onCreateNew: () => void
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
}

export function PersonSearchCombobox({
  value,
  onChange,
  onCreateNew,
  placeholder = "Search person...",
  hasError = false,
  disabled = false,
}: PersonSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const { query, setQuery, results, isLoading, error } = usePersonSearch({
    debounceMs: 300,
    minQueryLength: 2,
  })

  // Handle selection
  const handleSelect = useCallback(
    (person: PersonSearchResult) => {
      onChange({
        documentId: person.documentId,
        name: person.name,
      })
      setOpen(false)
      setQuery("")
    },
    [onChange, setQuery]
  )

  // Handle create new
  const handleCreateNew = useCallback(() => {
    // If there's a query, use it as the initial name
    if (query.length > 0) {
      onChange({ name: query })
    }
    onCreateNew()
    setOpen(false)
    setQuery("")
  }, [query, onChange, onCreateNew, setQuery])

  // Handle input for direct name entry
  const handleInputChange = useCallback(
    (newValue: string) => {
      setQuery(newValue)
      // Also update the value for "new" persons being typed
      if (newValue.length > 0) {
        onChange({ name: newValue })
      }
    },
    [setQuery, onChange]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "bg-tiween-green w-full justify-between border-white/20 text-white hover:bg-white/5",
            !value && "text-white/40",
            hasError && "border-red-500"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 text-white/40" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-surface w-[var(--radix-popover-trigger-width)] border-white/20 p-0"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Type to search..."
            value={query}
            onValueChange={handleInputChange}
            className="text-white placeholder:text-white/40"
          />
          <CommandList>
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-white/60">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {/* Empty state */}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty className="py-6 text-white/60">
                No person found. Create a new one?
              </CommandEmpty>
            )}

            {/* Results */}
            {results.length > 0 && (
              <CommandGroup
                heading="Existing Persons"
                className="text-white/40"
              >
                {results.map((person) => (
                  <CommandItem
                    key={person.documentId}
                    value={person.name}
                    onSelect={() => handleSelect(person)}
                    className="cursor-pointer text-white hover:bg-white/10"
                  >
                    <div className="flex w-full items-center gap-3">
                      {/* Photo or placeholder */}
                      {person.photo?.url ? (
                        <img
                          src={
                            person.photo.formats?.thumbnail?.url ||
                            person.photo.url
                          }
                          alt={person.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                          <User className="h-4 w-4 text-white/40" />
                        </div>
                      )}

                      {/* Name and nationality */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{person.name}</p>
                        {person.nationality && (
                          <p className="truncate text-xs text-white/50">
                            {person.nationality}
                          </p>
                        )}
                      </div>

                      {/* Check if selected */}
                      {value === person.name && (
                        <Check className="text-tiween-yellow h-4 w-4" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Separator and create new option */}
            {query.length > 0 && (
              <>
                <CommandSeparator className="bg-white/10" />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="text-tiween-yellow cursor-pointer hover:bg-white/10"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{query}&quot; as new person
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {/* Quick create when no query */}
            {query.length === 0 && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="cursor-pointer text-white/60 hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add a new person
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
