import type { Meta, StoryObj } from "@storybook/react"
import type { VenueCardVenue } from "./VenueCard"

import { VenueCard } from "./VenueCard"
import { VenueCardSkeleton } from "./VenueCardSkeleton"

const meta: Meta<typeof VenueCard> = {
  title: "Features/Venues/VenueCard",
  component: VenueCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Card component for displaying venue information including image, name, location, event count, and optional distance.",
      },
    },
  },
  argTypes: {
    onClick: {
      action: "clicked",
      description: "Called when the card is clicked",
    },
  },
}

export default meta
type Story = StoryObj<typeof VenueCard>

// Sample venue data
const sampleVenue: VenueCardVenue = {
  id: "1",
  name: "Cinéma Le Palace",
  imageUrl:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop",
  address: "Avenue Habib Bourguiba",
  city: "Tunis",
  eventCount: 5,
  distance: 2.3,
}

const theaterVenue: VenueCardVenue = {
  id: "2",
  name: "Théâtre Municipal de Tunis",
  imageUrl:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=200&h=200&fit=crop",
  address: "Rue de Rome",
  city: "Tunis",
  eventCount: 12,
}

const noEventsVenue: VenueCardVenue = {
  id: "3",
  name: "Espace Culturel El Teatro",
  imageUrl:
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop",
  address: "Zone Touristique",
  city: "Sousse",
  eventCount: 0,
}

const arabicVenue: VenueCardVenue = {
  id: "4",
  name: "دار الثقافة المغرب العربي",
  address: "شارع الحبيب بورقيبة",
  city: "تونس",
  eventCount: 8,
  distance: 1.5,
}

/**
 * Default state with all information
 */
export const Default: Story = {
  args: {
    venue: sampleVenue,
  },
}

/**
 * With distance indicator
 */
export const WithDistance: Story = {
  args: {
    venue: sampleVenue,
  },
}

/**
 * Without distance (distance not provided)
 */
export const NoDistance: Story = {
  args: {
    venue: theaterVenue,
  },
}

/**
 * Venue with no upcoming events
 */
export const NoEvents: Story = {
  args: {
    venue: noEventsVenue,
  },
}

/**
 * Many events
 */
export const ManyEvents: Story = {
  args: {
    venue: theaterVenue,
  },
}

/**
 * Without image (shows placeholder)
 */
export const NoImage: Story = {
  args: {
    venue: {
      ...sampleVenue,
      imageUrl: undefined,
    },
  },
}

/**
 * Long venue name (tests truncation)
 */
export const LongName: Story = {
  args: {
    venue: {
      ...sampleVenue,
      name: "Centre Culturel International de Tunis - Salle Polyvalente El Menzah",
    },
  },
}

/**
 * Long address (tests truncation)
 */
export const LongAddress: Story = {
  args: {
    venue: {
      ...sampleVenue,
      address: "123 Avenue Habib Bourguiba, Quartier Historique, Centre Ville",
      city: "Tunis",
    },
  },
}

/**
 * Clickable card
 */
export const Clickable: Story = {
  args: {
    venue: sampleVenue,
    onClick: () => alert("Venue clicked!"),
  },
}

/**
 * RTL mode with Arabic content
 */
export const RTL: Story = {
  args: {
    venue: arabicVenue,
    labels: {
      eventsThisWeek: (count) => `${count} أحداث هذا الأسبوع`,
      noEvents: "لا توجد أحداث",
      distanceAway: (km) => `${km.toFixed(1)} كم`,
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
    venue: sampleVenue,
    labels: {
      eventsThisWeek: (count) =>
        `${count} event${count > 1 ? "s" : ""} this week`,
      noEvents: "No events",
      distanceAway: (km) => `${km.toFixed(1)} km away`,
    },
  },
}

/**
 * Multiple cards in a list
 */
export const List: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <VenueCard venue={sampleVenue} onClick={() => {}} />
      <VenueCard venue={theaterVenue} onClick={() => {}} />
      <VenueCard venue={noEventsVenue} onClick={() => {}} />
    </div>
  ),
}

/**
 * Loading skeleton
 */
export const Loading: Story = {
  render: () => <VenueCardSkeleton />,
}

/**
 * Multiple loading skeletons
 */
export const LoadingList: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <VenueCardSkeleton />
      <VenueCardSkeleton />
      <VenueCardSkeleton />
    </div>
  ),
}
