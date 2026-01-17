import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { SearchBar } from "./SearchBar"

const meta: Meta<typeof SearchBar> = {
  title: "Features/Search/SearchBar",
  component: SearchBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Search input with recent searches dropdown, loading state, and clear functionality. Supports keyboard navigation and RTL mode.",
      },
    },
  },
  argTypes: {
    onChange: {
      action: "value changed",
      description: "Called when the input value changes",
    },
    onSearch: {
      action: "search submitted",
      description: "Called when user submits a search",
    },
    onClear: {
      action: "cleared",
      description: "Called when clear button is clicked",
    },
    isLoading: {
      control: "boolean",
      description: "Whether search is in progress",
    },
  },
}

export default meta
type Story = StoryObj<typeof SearchBar>

// Interactive wrapper component
function InteractiveSearchBar({
  initialValue = "",
  initialRecentSearches = ["Inception", "Festival Jazz", "Théâtre municipal"],
  isLoading = false,
}: {
  initialValue?: string
  initialRecentSearches?: string[]
  isLoading?: boolean
}) {
  const [value, setValue] = useState(initialValue)
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches)

  const handleSearch = (query: string) => {
    console.log("Search for:", query)
    // Add to recent searches if not already there
    if (!recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev.slice(0, 4)])
    }
  }

  const handleRemoveRecent = (query: string) => {
    setRecentSearches((prev) => prev.filter((q) => q !== query))
  }

  return (
    <SearchBar
      value={value}
      onChange={setValue}
      onSearch={handleSearch}
      onClear={() => setValue("")}
      isLoading={isLoading}
      recentSearches={recentSearches}
      onRemoveRecentSearch={handleRemoveRecent}
    />
  )
}

/**
 * Default empty state
 */
export const Default: Story = {
  args: {
    value: "",
    recentSearches: [],
  },
}

/**
 * Interactive story - type and search
 */
export const Interactive: Story = {
  render: () => <InteractiveSearchBar />,
}

/**
 * With recent searches (focus to see dropdown)
 */
export const WithRecentSearches: Story = {
  args: {
    value: "",
    recentSearches: ["Inception", "Festival Jazz", "Théâtre municipal"],
  },
}

/**
 * With value entered
 */
export const WithValue: Story = {
  args: {
    value: "Cinema",
    recentSearches: [],
  },
}

/**
 * Loading state (during search)
 */
export const Loading: Story = {
  args: {
    value: "Searching...",
    isLoading: true,
    recentSearches: [],
  },
}

/**
 * Interactive loading state
 */
export const InteractiveLoading: Story = {
  render: () => <InteractiveSearchBar initialValue="Jazz" isLoading={true} />,
}

/**
 * No recent searches
 */
export const NoRecentSearches: Story = {
  render: () => <InteractiveSearchBar initialRecentSearches={[]} />,
}

/**
 * Many recent searches
 */
export const ManyRecentSearches: Story = {
  render: () => (
    <InteractiveSearchBar
      initialRecentSearches={[
        "Inception",
        "Festival Jazz de Tunis",
        "Théâtre municipal",
        "Cinéma Le Palace",
        "Concert Anouar Brahem",
      ]}
    />
  ),
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  args: {
    value: "",
    recentSearches: ["سينما", "مسرح", "موسيقى"],
    labels: {
      placeholder: "البحث عن الأحداث...",
      clearSearch: "مسح البحث",
      recentSearches: "عمليات البحث الأخيرة",
      searching: "جاري البحث...",
    },
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  args: {
    value: "",
    recentSearches: ["Inception", "Jazz Festival", "Theater"],
    labels: {
      placeholder: "Search for events...",
      clearSearch: "Clear search",
      recentSearches: "Recent searches",
      searching: "Searching...",
    },
  },
}

/**
 * Custom styling
 */
export const CustomStyling: Story = {
  args: {
    value: "",
    recentSearches: [],
    className: "max-w-md",
  },
}

/**
 * Auto focus on mount
 */
export const AutoFocus: Story = {
  args: {
    value: "",
    recentSearches: ["Inception", "Festival Jazz"],
    autoFocus: true,
  },
}
