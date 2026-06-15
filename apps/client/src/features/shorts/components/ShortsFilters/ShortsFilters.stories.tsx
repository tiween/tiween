"use client"

import * as React from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type {
  ShortsFiltersLabels,
  ShortsFilters as ShortsFiltersType,
} from "../../types"

import { MOCK_GENRES } from "../../data/mock-shorts"
import { ShortsFilters } from "./ShortsFilters"

const arabicLabels: ShortsFiltersLabels = {
  search: "بحث",
  searchPlaceholder: "العنوان، المخرج...",
  genres: "الأنواع",
  duration: "المدة",
  durationRange: "من {min} إلى {max} دقيقة",
  year: "السنة",
  yearRange: "من {min} إلى {max}",
  country: "البلد",
  language: "اللغة",
  awards: "الجوائز",
  hasAwards: "الأفلام الحائزة على جوائز فقط",
  availability: "التوفر",
  availableOnline: "متاح على الإنترنت",
  platforms: "المنصات",
  rating: "التقييم",
  ratingMin: "الحد الأدنى للتقييم",
  sortBy: "ترتيب حسب",
  sortByOptions: {
    latest: "الأحدث",
    rating: "الأعلى تقييماً",
    year: "السنة",
    duration: "المدة",
    title: "العنوان",
  },
  clearFilters: "مسح الفلاتر",
  applyFilters: "تطبيق",
  resultsCount: "{count} نتيجة",
  noResults: "لا توجد نتائج",
}

const meta: Meta<typeof ShortsFilters> = {
  title: "Features/Shorts/ShortsFilters",
  component: ShortsFilters,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Filter component for the shorts directory. Features search bar, filter sheet (mobile-friendly), active filter chips, and results count. Supports debounced search, temporary filter state, and RTL mode.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    totalResults: {
      control: { type: "number", min: 0 },
      description: "Total results count to display",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: function DefaultFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "latest",
      sortOrder: "desc",
    })

    return (
      <ShortsFilters
        filters={filters}
        genres={MOCK_GENRES}
        totalResults={42}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
}

export const WithActiveFilters: Story = {
  render: function ActiveFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "rating",
      sortOrder: "desc",
      genres: ["drame", "comedie"],
      durationMin: 10,
      durationMax: 30,
      rating: 7,
      availableOnline: true,
    })

    return (
      <ShortsFilters
        filters={filters}
        genres={MOCK_GENRES}
        totalResults={15}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters with multiple active selections showing filter chips.",
      },
    },
  },
}

export const WithSearch: Story = {
  render: function SearchFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      query: "Brotherhood",
      sortBy: "latest",
      sortOrder: "desc",
    })

    return (
      <ShortsFilters
        filters={filters}
        genres={MOCK_GENRES}
        totalResults={3}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters with active search query.",
      },
    },
  },
}

export const NoResults: Story = {
  render: function NoResultsFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      query: "xyz123nonexistent",
      sortBy: "latest",
      sortOrder: "desc",
    })

    return (
      <ShortsFilters
        filters={filters}
        genres={MOCK_GENRES}
        totalResults={0}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters showing no results state.",
      },
    },
  },
}

export const AwardsOnly: Story = {
  render: function AwardsFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "rating",
      sortOrder: "desc",
      hasAwards: true,
    })

    return (
      <ShortsFilters
        filters={filters}
        genres={MOCK_GENRES}
        totalResults={8}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters showing only award-winning films.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: function RTLFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "rating",
      sortOrder: "desc",
      genres: ["drame"],
      availableOnline: true,
    })

    return (
      <div dir="rtl" className="font-arabic">
        <ShortsFilters
          filters={filters}
          genres={MOCK_GENRES.map((g) => ({
            ...g,
            name:
              g.slug === "drame"
                ? "دراما"
                : g.slug === "comedie"
                  ? "كوميديا"
                  : g.slug === "documentaire"
                    ? "وثائقي"
                    : g.name,
          }))}
          totalResults={24}
          labels={arabicLabels}
          onFiltersChange={setFilters}
          onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
        />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters in RTL mode with Arabic labels.",
      },
    },
  },
}

export const Interactive: Story = {
  render: function InteractiveFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "latest",
      sortOrder: "desc",
    })
    const [log, setLog] = React.useState<string[]>([])

    const handleFiltersChange = (newFilters: ShortsFiltersType) => {
      setFilters(newFilters)
      setLog((prev) => [
        `Filters changed: ${JSON.stringify(newFilters, null, 2)}`,
        ...prev.slice(0, 4),
      ])
    }

    const handleSearch = (query: string) => {
      setFilters((prev) => ({ ...prev, query }))
      setLog((prev) => [`Search: "${query}"`, ...prev.slice(0, 4)])
    }

    return (
      <div className="space-y-4">
        <ShortsFilters
          filters={filters}
          genres={MOCK_GENRES}
          totalResults={42}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
        />
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-foreground mb-2 text-sm font-medium">
            Activity Log
          </h4>
          <div className="text-muted-foreground space-y-1 font-mono text-xs">
            {log.length === 0 ? (
              <p>Interact with filters to see events...</p>
            ) : (
              log.map((entry, i) => (
                <pre key={i} className="whitespace-pre-wrap">
                  {entry}
                </pre>
              ))
            )}
          </div>
        </div>
      </div>
    )
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Interactive demo showing filter state changes.",
      },
    },
  },
}

export const ManyGenres: Story = {
  render: function ManyGenresFilters() {
    const [filters, setFilters] = React.useState<ShortsFiltersType>({
      sortBy: "latest",
      sortOrder: "desc",
    })

    const extendedGenres = [
      ...MOCK_GENRES,
      { slug: "horreur", name: "Horreur" },
      { slug: "science-fiction", name: "Science-Fiction" },
      { slug: "action", name: "Action" },
      { slug: "aventure", name: "Aventure" },
      { slug: "historique", name: "Historique" },
      { slug: "biographie", name: "Biographie" },
    ]

    return (
      <ShortsFilters
        filters={filters}
        genres={extendedGenres}
        totalResults={100}
        onFiltersChange={setFilters}
        onSearch={(query) => setFilters((prev) => ({ ...prev, query }))}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Filters with extended genre list.",
      },
    },
  },
}
