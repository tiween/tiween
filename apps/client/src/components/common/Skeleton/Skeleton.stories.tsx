import { EventCardSkeleton } from "@/features/events/components/EventCard/EventCardSkeleton"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Skeleton } from "@/components/ui/skeleton"

import { FilmHeroSkeleton } from "./FilmHeroSkeleton"
import { ListSkeleton } from "./ListSkeleton"
import { TicketCardSkeleton } from "./TicketCardSkeleton"

// ============================================================================
// ListSkeleton Stories
// ============================================================================

const listMeta: Meta<typeof ListSkeleton> = {
  title: "Common/Skeleton/ListSkeleton",
  component: ListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "ListSkeleton is a configurable skeleton placeholder for list views. Use it when loading lists of items.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    rows: {
      control: { type: "number", min: 1, max: 10 },
      description: "Number of skeleton rows",
    },
    rowHeight: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Height of each row",
    },
    showAvatar: {
      control: "boolean",
      description: "Show circular avatar placeholder",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background max-w-md rounded-lg p-4">
        <Story />
      </div>
    ),
  ],
}

export default listMeta
type ListStory = StoryObj<typeof listMeta>

export const Default: ListStory = {
  args: {
    rows: 3,
    rowHeight: "md",
    showAvatar: false,
  },
}

export const WithAvatars: ListStory = {
  args: {
    rows: 4,
    rowHeight: "md",
    showAvatar: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "List skeleton with avatar placeholders for user lists or profiles.",
      },
    },
  },
}

export const LargeRows: ListStory = {
  args: {
    rows: 3,
    rowHeight: "lg",
    showAvatar: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Large row height for lists with more content per item.",
      },
    },
  },
}

export const ManyRows: ListStory = {
  args: {
    rows: 8,
    rowHeight: "sm",
    showAvatar: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Small rows for compact list views.",
      },
    },
  },
}

// ============================================================================
// FilmHeroSkeleton Stories
// ============================================================================

export const FilmHeroDefault: ListStory = {
  render: () => <FilmHeroSkeleton aspectMode="auto" />,
  decorators: [
    (Story) => (
      <div className="max-w-2xl overflow-hidden rounded-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "FilmHeroSkeleton with auto aspect mode (portrait on mobile, landscape on desktop).",
      },
    },
  },
}

export const FilmHeroPortrait: ListStory = {
  render: () => <FilmHeroSkeleton aspectMode="portrait" />,
  decorators: [
    (Story) => (
      <div className="max-w-sm overflow-hidden rounded-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "FilmHeroSkeleton in portrait mode (4:5 aspect ratio).",
      },
    },
  },
}

export const FilmHeroLandscape: ListStory = {
  render: () => <FilmHeroSkeleton aspectMode="landscape" />,
  decorators: [
    (Story) => (
      <div className="max-w-2xl overflow-hidden rounded-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "FilmHeroSkeleton in landscape mode (16:9 aspect ratio).",
      },
    },
  },
}

// ============================================================================
// TicketCardSkeleton Stories
// ============================================================================

export const TicketCardLarge: ListStory = {
  render: () => <TicketCardSkeleton size="large" />,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Full ticket card skeleton with QR code placeholder.",
      },
    },
  },
}

export const TicketCardSmall: ListStory = {
  render: () => <TicketCardSkeleton size="small" />,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Compact ticket card skeleton for list views.",
      },
    },
  },
}

export const TicketCardList: ListStory = {
  render: () => (
    <div className="space-y-3">
      <TicketCardSkeleton size="small" />
      <TicketCardSkeleton size="small" />
      <TicketCardSkeleton size="small" />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Multiple ticket card skeletons in a list.",
      },
    },
  },
}

// ============================================================================
// EventCardSkeleton Stories (re-exported from features)
// ============================================================================

export const EventCardDefault: ListStory = {
  render: () => <EventCardSkeleton variant="default" />,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "EventCardSkeleton in default variant.",
      },
    },
  },
}

export const EventCardCompact: ListStory = {
  render: () => <EventCardSkeleton variant="compact" />,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "EventCardSkeleton in compact variant.",
      },
    },
  },
}

export const EventCardFeatured: ListStory = {
  render: () => <EventCardSkeleton variant="featured" />,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "EventCardSkeleton in featured variant.",
      },
    },
  },
}

// ============================================================================
// Base Skeleton Stories
// ============================================================================

export const BaseSkeleton: ListStory = {
  render: () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The base Skeleton component can be composed to create custom loading states.",
      },
    },
  },
}

// ============================================================================
// All Skeletons Overview
// ============================================================================

export const AllSkeletons: ListStory = {
  render: () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          ListSkeleton
        </h3>
        <ListSkeleton rows={3} showAvatar />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          TicketCardSkeleton (small)
        </h3>
        <TicketCardSkeleton size="small" />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          EventCardSkeleton
        </h3>
        <EventCardSkeleton variant="default" />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          FilmHeroSkeleton
        </h3>
        <FilmHeroSkeleton aspectMode="landscape" />
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Overview of all skeleton presets available in the common library.",
      },
    },
  },
}
