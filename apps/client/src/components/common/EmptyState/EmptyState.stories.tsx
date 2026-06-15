import { useState } from "react"
import { Sparkles } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { EmptyStateLabels } from "./EmptyState"

import { EmptyState } from "./EmptyState"

// Arabic labels for RTL stories
const arabicLabels: EmptyStateLabels = {
  noResults: {
    title: "لا توجد نتائج",
    description: "جرب بحثاً آخر",
  },
  emptyWatchlist: {
    title: "قائمة المتابعة فارغة",
    description: "أضف الأحداث للعثور عليها هنا",
  },
  noTickets: {
    title: "لا توجد تذاكر",
    description: "ستظهر تذاكرك هنا بعد الشراء",
  },
  noEvents: {
    title: "لا توجد أحداث",
    description: "لا توجد أحداث في هذه الفئة",
  },
  offline: {
    title: "أنت غير متصل",
    description: "تحقق من اتصالك بالإنترنت",
  },
}

const meta: Meta<typeof EmptyState> = {
  title: "Common/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "EmptyState displays a friendly message when content is empty or unavailable. Supports preset variants for common scenarios and fully custom configurations.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "noResults",
        "emptyWatchlist",
        "noTickets",
        "noEvents",
        "offline",
        "custom",
      ],
      description: "Preset variant with icon and default text",
    },
    title: {
      control: "text",
      description: "Custom title (overrides preset)",
    },
    description: {
      control: "text",
      description: "Custom description (overrides preset)",
    },
    primaryAction: {
      description: "Primary call-to-action button",
    },
    secondaryAction: {
      description: "Secondary action button",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background min-w-[320px] rounded-lg p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// No Search Results
export const NoResults: Story = {
  args: {
    variant: "noResults",
  },
  parameters: {
    docs: {
      description: {
        story: "Displayed when a search query returns no matching results.",
      },
    },
  },
}

// Empty Watchlist
export const EmptyWatchlist: Story = {
  args: {
    variant: "emptyWatchlist",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displayed on the watchlist page when the user has not saved any events.",
      },
    },
  },
}

// No Tickets
export const NoTickets: Story = {
  args: {
    variant: "noTickets",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displayed on the tickets page when the user has no purchased tickets.",
      },
    },
  },
}

// No Events
export const NoEvents: Story = {
  args: {
    variant: "noEvents",
  },
  parameters: {
    docs: {
      description: {
        story: "Displayed when a category or filter returns no events.",
      },
    },
  },
}

// Offline Mode
export const Offline: Story = {
  args: {
    variant: "offline",
  },
  parameters: {
    docs: {
      description: {
        story: "Displayed when the user loses internet connection.",
      },
    },
  },
}

// With Primary Action
export const WithPrimaryAction: Story = {
  args: {
    variant: "emptyWatchlist",
    primaryAction: {
      label: "Découvrir des événements",
      onClick: () => {},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "EmptyState with a primary call-to-action button.",
      },
    },
  },
}

// With Both Actions
export const WithBothActions: Story = {
  args: {
    variant: "noResults",
    primaryAction: {
      label: "Nouvelle recherche",
      onClick: () => {},
    },
    secondaryAction: {
      label: "Voir toutes les catégories",
      onClick: () => {},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "EmptyState with both primary and secondary action buttons.",
      },
    },
  },
}

// Custom Variant
export const CustomVariant: Story = {
  args: {
    variant: "custom",
    title: "Contenu personnalisé",
    description: "Vous pouvez utiliser n'importe quel titre et description.",
    illustration: (
      <div className="bg-primary/10 rounded-full p-4">
        <Sparkles className="text-primary h-8 w-8" />
      </div>
    ),
    primaryAction: {
      label: "Action personnalisée",
      onClick: () => {},
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Fully custom EmptyState with custom illustration, title, description, and action.",
      },
    },
  },
}

// RTL Mode with Arabic
export const RTLMode: Story = {
  args: {
    variant: "emptyWatchlist",
    labels: arabicLabels,
    primaryAction: {
      label: "اكتشف الأحداث",
      onClick: () => {},
    },
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        className="font-arabic bg-background min-w-[320px] rounded-lg p-8"
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "EmptyState in RTL mode with Arabic text. Layout is centered, so it works naturally in both directions.",
      },
    },
  },
}

// Interactive Demo
export const InteractiveDemo: Story = {
  render: function InteractiveEmptyState() {
    const [variant, setVariant] = useState<
      "noResults" | "emptyWatchlist" | "noTickets" | "noEvents" | "offline"
    >("noResults")

    const variants = [
      "noResults",
      "emptyWatchlist",
      "noTickets",
      "noEvents",
      "offline",
    ] as const

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap justify-center gap-2">
          {variants.map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                variant === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <EmptyState
          variant={variant}
          primaryAction={{
            label: "Action",
            onClick: () => {},
          }}
        />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demo to switch between all preset variants and see their default icons and text.",
      },
    },
  },
}

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {(
        [
          "noResults",
          "emptyWatchlist",
          "noTickets",
          "noEvents",
          "offline",
        ] as const
      ).map((variant) => (
        <div key={variant} className="bg-card rounded-lg p-4">
          <p className="text-muted-foreground mb-4 text-center text-xs font-medium tracking-wider uppercase">
            {variant}
          </p>
          <EmptyState variant={variant} />
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="min-w-[800px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "All five preset variants displayed side by side for comparison.",
      },
    },
  },
}
