import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { EventCardEvent } from "../../types/event.types"
import type { EventCardLabels } from "./EventCard"

import { storyPosters } from "@/lib/storybook/tmdb-posters"

import { EventCard } from "./EventCard"
import { EventCardSkeleton } from "./EventCardSkeleton"

// Event data using real TMDB movie posters
const dummyEvent: EventCardEvent = {
  id: "1",
  title: "La Nuit des Étoiles",
  posterUrl: storyPosters.event.cinema,
  category: "Cinéma",
  venueName: "Le Colisée",
  date: new Date("2025-02-15"),
  price: 25,
  currency: "TND",
}

const longTitleEvent: EventCardEvent = {
  ...dummyEvent,
  id: "2",
  title:
    "Festival International du Film Documentaire de Carthage - Édition Spéciale du 50ème Anniversaire",
}

const noPriceEvent: EventCardEvent = {
  id: "3",
  title: "Exposition d'Art Contemporain",
  posterUrl: storyPosters.event.documentary,
  category: "Expositions",
  venueName: "Musée du Bardo",
  date: new Date("2025-03-10"),
}

const theatreEvent: EventCardEvent = {
  id: "4",
  title: "Le Malade Imaginaire",
  posterUrl: storyPosters.event.theatre,
  category: "Théâtre",
  venueName: "Théâtre Municipal",
  date: new Date("2025-02-28"),
  price: 35,
  currency: "TND",
}

const musicEvent: EventCardEvent = {
  id: "5",
  title: "Concert de Jazz",
  posterUrl: storyPosters.event.music,
  category: "Musique",
  venueName: "Jazz Club Tunis",
  date: new Date("2025-03-05"),
  price: 40,
  currency: "TND",
}

// Arabic labels for RTL stories
const arabicLabels: EventCardLabels = {
  addToWatchlist: "أضف إلى قائمة المتابعة",
  removeFromWatchlist: "إزالة من قائمة المتابعة",
  priceFrom: (price) => `ابتداءً من ${price}`,
}

const arabicEvent: EventCardEvent = {
  id: "6",
  title: "مهرجان أيام قرطاج السينمائية",
  posterUrl: storyPosters.event.arabic,
  category: "Cinéma",
  venueName: "قصر المؤتمرات",
  date: new Date("2025-04-15"),
  price: 20,
  currency: "TND",
}

const meta: Meta<typeof EventCard> = {
  title: "Features/Events/EventCard",
  component: EventCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "EventCard displays event preview information including poster, title, venue, date, and watchlist functionality. Supports three variants: default, compact, and featured.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "compact", "featured"],
      description: "Visual variant of the card",
    },
    isWatchlisted: {
      control: "boolean",
      description: "Whether the event is in the user's watchlist",
    },
    isLoading: {
      control: "boolean",
      description: "Shows skeleton placeholder when true",
    },
    onWatchlist: {
      action: "watchlist-toggled",
      description: "Called when watchlist button is clicked",
    },
    onClick: {
      action: "card-clicked",
      description: "Called when the card is clicked",
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default story
export const Default: Story = {
  args: {
    event: dummyEvent,
    variant: "default",
    isWatchlisted: false,
  },
}

// Compact variant
export const Compact: Story = {
  args: {
    event: dummyEvent,
    variant: "compact",
    isWatchlisted: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Compact variant with smaller image and no price display. Ideal for list views.",
      },
    },
  },
}

// Featured variant
export const Featured: Story = {
  args: {
    event: dummyEvent,
    variant: "featured",
    isWatchlisted: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Featured variant with larger image for highlighted events on homepage.",
      },
    },
  },
}

// Watchlisted state
export const Watchlisted: Story = {
  args: {
    event: dummyEvent,
    variant: "default",
    isWatchlisted: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Shows filled heart icon when event is in user's watchlist.",
      },
    },
  },
}

// Loading state (skeleton)
export const Loading: Story = {
  args: {
    event: dummyEvent,
    variant: "default",
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Skeleton placeholder shown during loading state.",
      },
    },
  },
}

// No price
export const NoPrice: Story = {
  args: {
    event: noPriceEvent,
    variant: "default",
    isWatchlisted: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Event without price information (free or TBD).",
      },
    },
  },
}

// Long title (truncated)
export const LongTitle: Story = {
  args: {
    event: longTitleEvent,
    variant: "default",
    isWatchlisted: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Long titles are truncated with ellipsis after 2 lines.",
      },
    },
  },
}

// Interactive story with state
export const WithInteraction: Story = {
  render: function InteractiveCard() {
    const [isWatchlisted, setIsWatchlisted] = useState(false)

    return (
      <div className="space-y-4">
        <EventCard
          event={dummyEvent}
          variant="default"
          isWatchlisted={isWatchlisted}
          onWatchlist={() => setIsWatchlisted(!isWatchlisted)}
          onClick={() => {}}
        />
        <p className="text-muted-foreground text-sm">
          Watchlist status:{" "}
          <strong className={isWatchlisted ? "text-primary" : ""}>
            {isWatchlisted ? "Added" : "Not added"}
          </strong>
        </p>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive example demonstrating hover and watchlist toggle functionality.",
      },
    },
  },
}

// RTL mode with Arabic content
export const RTLMode: Story = {
  args: {
    event: arabicEvent,
    variant: "default",
    isWatchlisted: false,
    labels: arabicLabels,
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="font-arabic max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "EventCard in RTL mode with Arabic content. Watchlist button position is flipped.",
      },
    },
  },
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-6 md:grid-cols-3">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Default
        </h3>
        <EventCard
          event={dummyEvent}
          variant="default"
          onWatchlist={() => {}}
          onClick={() => {}}
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Compact
        </h3>
        <EventCard
          event={dummyEvent}
          variant="compact"
          onWatchlist={() => {}}
          onClick={() => {}}
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Featured
        </h3>
        <EventCard
          event={dummyEvent}
          variant="featured"
          onWatchlist={() => {}}
          onClick={() => {}}
        />
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
    layout: "padded",
    docs: {
      description: {
        story: "All three variants displayed side by side for comparison.",
      },
    },
  },
}

// Category badges showcase
export const CategoryBadges: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <EventCard event={dummyEvent} onWatchlist={() => {}} />
      <EventCard event={theatreEvent} onWatchlist={() => {}} />
      <EventCard event={noPriceEvent} onWatchlist={() => {}} />
      <EventCard event={musicEvent} onWatchlist={() => {}} />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Different category badges with their respective styling.",
      },
    },
  },
}

// Skeleton variants
export const SkeletonVariants: Story = {
  render: () => (
    <div className="grid gap-6 md:grid-cols-3">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Default Skeleton
        </h3>
        <EventCardSkeleton variant="default" />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Compact Skeleton
        </h3>
        <EventCardSkeleton variant="compact" />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Featured Skeleton
        </h3>
        <EventCardSkeleton variant="featured" />
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
        story: "Skeleton placeholders for all three variants.",
      },
    },
  },
}
