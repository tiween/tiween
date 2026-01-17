import { useState } from "react"

import type { EventCardEvent } from "@/features/events/types"
import type { Meta, StoryObj } from "@storybook/react"

import { SearchResults } from "./SearchResults"
import { SearchResultsEmpty } from "./SearchResultsEmpty"
import { SearchResultsSkeleton } from "./SearchResultsSkeleton"

const meta: Meta<typeof SearchResults> = {
  title: "Features/Search/SearchResults",
  component: SearchResults,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Search results component with result count, filter chips, event cards, empty state, and infinite scroll support.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SearchResults>

// Sample events data
const sampleEvents: EventCardEvent[] = [
  {
    id: "1",
    title: "Inception",
    posterUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=300&fit=crop",
    category: "Cinéma",
    venueName: "Cinéma Le Palace",
    date: "2024-01-20",
    price: 15,
  },
  {
    id: "2",
    title: "Le Malade Imaginaire",
    posterUrl:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=200&h=300&fit=crop",
    category: "Théâtre",
    venueName: "Théâtre Municipal",
    date: "2024-01-21",
    price: 25,
  },
  {
    id: "3",
    title: "Festival Jazz de Tunis",
    posterUrl:
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=300&fit=crop",
    category: "Musique",
    venueName: "Cité de la Culture",
    date: "2024-01-22",
    price: 30,
  },
  {
    id: "4",
    title: "Exposition Art Contemporain",
    posterUrl:
      "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=200&h=300&fit=crop",
    category: "Expositions",
    venueName: "Musée du Bardo",
    date: "2024-01-23",
  },
  {
    id: "5",
    title: "The Dark Knight",
    posterUrl:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&h=300&fit=crop",
    category: "Cinéma",
    venueName: "Cinéma Pathé",
    date: "2024-01-24",
    price: 18,
  },
]

const arabicEvents: EventCardEvent[] = [
  {
    id: "1",
    title: "حفل موسيقي",
    category: "موسيقى",
    venueName: "قصر الثقافة",
    date: "2024-01-20",
    price: 20,
  },
  {
    id: "2",
    title: "مسرحية العرس",
    category: "مسرح",
    venueName: "المسرح البلدي",
    date: "2024-01-21",
    price: 15,
  },
]

// Interactive wrapper
function InteractiveSearchResults() {
  const [watchlisted, setWatchlisted] = useState(new Set<string | number>())
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [results, setResults] = useState(sampleEvents.slice(0, 3))

  const toggleWatchlist = (id: string | number) => {
    setWatchlisted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const loadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setResults((prev) => [...prev, ...sampleEvents.slice(3)])
      setIsLoadingMore(false)
    }, 1000)
  }

  return (
    <SearchResults
      query="Cinema"
      results={results}
      totalCount={5}
      hasMore={results.length < 5}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMore}
      onEventClick={(e) => console.log("Clicked:", e.title)}
      onWatchlist={toggleWatchlist}
      watchlistedIds={watchlisted}
    />
  )
}

/**
 * Default with results
 */
export const Default: Story = {
  args: {
    query: "Cinema",
    results: sampleEvents,
    totalCount: 42,
    hasMore: false,
  },
}

/**
 * Interactive - scroll to bottom to load more
 */
export const Interactive: Story = {
  render: () => <InteractiveSearchResults />,
}

/**
 * With active filters
 */
export const WithFilters: Story = {
  args: {
    query: "Cinema",
    results: sampleEvents.slice(0, 3),
    totalCount: 3,
    activeFilters: [
      { key: "category", label: "Cinéma" },
      { key: "date", label: "Cette semaine" },
    ],
    onRemoveFilter: (key) => console.log("Remove filter:", key),
  },
}

/**
 * Loading more results
 */
export const LoadingMore: Story = {
  args: {
    query: "Cinema",
    results: sampleEvents.slice(0, 3),
    totalCount: 42,
    hasMore: true,
    isLoadingMore: true,
  },
}

/**
 * No results - shows empty state
 */
export const NoResults: Story = {
  args: {
    query: "xyz123",
    results: [],
    totalCount: 0,
  },
}

/**
 * Initial loading state
 */
export const Loading: Story = {
  args: {
    query: "Cinema",
    results: [],
    totalCount: 0,
    isLoading: true,
  },
}

/**
 * Single result
 */
export const SingleResult: Story = {
  args: {
    query: "Inception",
    results: [sampleEvents[0]],
    totalCount: 1,
  },
}

/**
 * With watchlisted items
 */
export const WithWatchlisted: Story = {
  args: {
    query: "Cinema",
    results: sampleEvents,
    totalCount: 5,
    watchlistedIds: new Set(["1", "3"]),
  },
}

/**
 * RTL mode with Arabic content
 */
export const RTL: Story = {
  args: {
    query: "موسيقى",
    results: arabicEvents,
    totalCount: 2,
    activeFilters: [{ key: "category", label: "موسيقى" }],
    labels: {
      resultsFor: (count, query) => `${count} نتيجة لـ "${query}"`,
      noResults: "لا توجد نتائج لـ",
      noResultsSuggestion: "جرب بحثًا آخر أو استكشف الفئات أدناه",
      tryAgain: "مسح البحث",
      loadingMore: "جاري التحميل...",
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
    query: "Jazz",
    results: sampleEvents.slice(0, 3),
    totalCount: 3,
    labels: {
      resultsFor: (count, query) =>
        `${count} result${count > 1 ? "s" : ""} for "${query}"`,
      noResults: "No results for",
      noResultsSuggestion: "Try another search or explore categories below",
      tryAgain: "Clear search",
      loadingMore: "Loading...",
    },
  },
}

/**
 * Empty state component directly
 */
export const EmptyStateOnly: Story = {
  render: () => (
    <SearchResultsEmpty
      query="xyz123"
      onClear={() => console.log("Clear search")}
    />
  ),
}

/**
 * Skeleton loading component directly
 */
export const SkeletonOnly: Story = {
  render: () => <SearchResultsSkeleton count={3} />,
}
