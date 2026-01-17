import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { CategoryType } from "./CategoryTabs"

import { CategoryTabs } from "./CategoryTabs"

const meta: Meta<typeof CategoryTabs> = {
  title: "Features/Events/CategoryTabs",
  component: CategoryTabs,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Horizontal scrolling category filter tabs for event discovery. Supports RTL mode and i18n labels.",
      },
    },
  },
  argTypes: {
    activeCategory: {
      control: "select",
      options: ["all", "cinema", "theater", "shorts", "music", "exhibitions"],
      description: "Currently active category",
    },
    onCategoryChange: {
      action: "category changed",
      description: "Called when a category tab is clicked",
    },
  },
}

export default meta
type Story = StoryObj<typeof CategoryTabs>

// Wrapper component for interactive stories
function InteractiveCategoryTabs({
  initialCategory = "all",
}: {
  initialCategory?: CategoryType
}) {
  const [category, setCategory] = useState<CategoryType>(initialCategory)
  return (
    <CategoryTabs activeCategory={category} onCategoryChange={setCategory} />
  )
}

/**
 * Default state with "Tout" (All) selected
 */
export const Default: Story = {
  args: {
    activeCategory: "all",
  },
}

/**
 * Interactive story - click tabs to see active state change
 */
export const Interactive: Story = {
  render: () => <InteractiveCategoryTabs />,
}

/**
 * Cinema category active
 */
export const CinemaActive: Story = {
  args: {
    activeCategory: "cinema",
  },
}

/**
 * Theater category active
 */
export const TheaterActive: Story = {
  args: {
    activeCategory: "theater",
  },
}

/**
 * Shorts category active
 */
export const ShortsActive: Story = {
  args: {
    activeCategory: "shorts",
  },
}

/**
 * Music category active
 */
export const MusicActive: Story = {
  args: {
    activeCategory: "music",
  },
}

/**
 * Exhibitions category active
 */
export const ExhibitionsActive: Story = {
  args: {
    activeCategory: "exhibitions",
  },
}

/**
 * Narrow container - demonstrates horizontal scroll with fade indicators
 */
export const WithScroll: Story = {
  args: {
    activeCategory: "all",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "300px" }}>
        <Story />
      </div>
    ),
  ],
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  args: {
    activeCategory: "cinema",
    labels: {
      all: "الكل",
      cinema: "سينما",
      theater: "مسرح",
      shorts: "أفلام قصيرة",
      music: "موسيقى",
      exhibitions: "معارض",
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
    activeCategory: "all",
    labels: {
      all: "All",
      cinema: "Cinema",
      theater: "Theater",
      shorts: "Shorts",
      music: "Music",
      exhibitions: "Exhibitions",
    },
  },
}

/**
 * Custom className for styling
 */
export const WithCustomClass: Story = {
  args: {
    activeCategory: "all",
    className: "bg-muted p-2 rounded-lg",
  },
}
