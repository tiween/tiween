"use client"

import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type {
  ShortFilmCardLabels,
  ShortFilmCard as ShortFilmCardType,
} from "../../types"

import { ShortFilmCard } from "./ShortFilmCard"
import { ShortFilmCardSkeleton } from "./ShortFilmCardSkeleton"

// Mock film data using real Tunisian short film info
const mockFilm: ShortFilmCardType = {
  id: 6,
  documentId: "brotherhood-006",
  title: "Brotherhood",
  originalTitle: "الإخوة",
  posterUrl: "https://i.ytimg.com/vi/ImnbMyEkXX0/maxresdefault.jpg",
  slug: "brotherhood",
  duration: 25,
  releaseYear: 2018,
  rating: 8.4,
  genres: ["Drame"],
  director: "Meryam Joobeur",
  isAvailableOnline: true,
  isFeatured: true,
}

const mockFilmNoOnline: ShortFilmCardType = {
  id: 4,
  documentId: "souliers-aid-004",
  title: "Les Souliers de l'Aïd",
  originalTitle: "صباط العيد",
  posterUrl: "https://artify.tn/images/films/my-shoes.jpg",
  slug: "les-souliers-de-laid",
  duration: 30,
  releaseYear: 2012,
  rating: 8.7,
  genres: ["Drame", "Fantastique"],
  director: "Anis Lassoued",
  isAvailableOnline: false,
  isFeatured: false,
}

const mockFilmMinimal: ShortFilmCardType = {
  id: 10,
  documentId: "tahtima-010",
  title: "Tahtima",
  originalTitle: "تحطيمة",
  posterUrl: "https://i.ytimg.com/vi/w6sPncl04lU/maxresdefault.jpg",
  slug: "tahtima",
  duration: 24,
  releaseYear: 2020,
  isAvailableOnline: true,
  isFeatured: false,
}

const arabicLabels: ShortFilmCardLabels = {
  watchNow: "شاهد الآن",
  viewDetails: "التفاصيل",
  playTrailer: "عرض الإعلان",
  minutes: "دقيقة",
  notAvailableOnline: "غير متاح على الإنترنت",
  featured: "مميز",
}

const meta: Meta<typeof ShortFilmCard> = {
  title: "Features/Shorts/ShortFilmCard",
  component: ShortFilmCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Card component for displaying short film information. Features hover interactions on desktop (play button, title, CTA) and simplified view on mobile with direct link navigation. Supports RTL and i18n.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    showPlayButton: {
      control: "boolean",
      description: "Show play trailer button on hover",
    },
    isLoading: {
      control: "boolean",
      description: "Shows skeleton placeholder when true",
    },
    onPlayTrailer: {
      action: "play-trailer",
      description: "Called when play button is clicked",
    },
    onClick: {
      action: "card-clicked",
      description: "Called when the card is clicked",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    film: mockFilm,
    showPlayButton: true,
  },
}

export const Featured: Story = {
  args: {
    film: mockFilm,
    showPlayButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Featured card shows a badge in the top-left corner.",
      },
    },
  },
}

export const NotAvailableOnline: Story = {
  args: {
    film: mockFilmNoOnline,
    showPlayButton: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Film not available online shows 'View Details' instead of 'Watch Now'.",
      },
    },
  },
}

export const MinimalInfo: Story = {
  args: {
    film: mockFilmMinimal,
    showPlayButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Card with minimal film information (no rating, no genres).",
      },
    },
  },
}

export const NoPlayButton: Story = {
  args: {
    film: mockFilm,
    showPlayButton: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Card without play button, only CTA on hover.",
      },
    },
  },
}

export const Loading: Story = {
  args: {
    film: mockFilm,
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Loading state shows skeleton placeholder.",
      },
    },
  },
}

export const Interactive: Story = {
  render: function InteractiveCard() {
    const [lastAction, setLastAction] = useState<string | null>(null)

    return (
      <div className="space-y-4">
        <ShortFilmCard
          film={mockFilm}
          showPlayButton
          onPlayTrailer={() => setLastAction("Play trailer clicked")}
          onClick={() => setLastAction("Card clicked - navigating to details")}
        />
        {lastAction && (
          <p className="text-muted-foreground text-sm">
            Last action: <strong className="text-primary">{lastAction}</strong>
          </p>
        )}
      </div>
    )
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Interactive demo showing click handlers.",
      },
    },
  },
}

export const RTLMode: Story = {
  args: {
    film: {
      ...mockFilm,
      title: "الإخوة",
      originalTitle: "Brotherhood",
    },
    labels: arabicLabels,
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="font-arabic w-48">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Card in RTL mode with Arabic content and labels.",
      },
    },
  },
}

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <ShortFilmCard
        film={mockFilm}
        showPlayButton
        onClick={() => {}}
        onPlayTrailer={() => {}}
      />
      <ShortFilmCard
        film={mockFilmNoOnline}
        showPlayButton
        onClick={() => {}}
        onPlayTrailer={() => {}}
      />
      <ShortFilmCard
        film={mockFilmMinimal}
        showPlayButton
        onClick={() => {}}
        onPlayTrailer={() => {}}
      />
      <ShortFilmCard
        film={{
          ...mockFilm,
          id: 2,
          documentId: "le-masseur-002",
          title: "Le Masseur",
          originalTitle: "الطيّاب",
          posterUrl: "https://i.ytimg.com/vi/zjJjkSHNRx4/maxresdefault.jpg",
          slug: "le-masseur",
          duration: 23,
          releaseYear: 2011,
          rating: 8.6,
          director: "Anouar Lahouar",
          isFeatured: true,
        }}
        showPlayButton
        onClick={() => {}}
        onPlayTrailer={() => {}}
      />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Multiple cards in a responsive grid layout.",
      },
    },
  },
}

export const SkeletonGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ShortFilmCardSkeleton key={i} />
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Skeleton grid for loading states.",
      },
    },
  },
}

export const AllFilmVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          Featured + Available Online
        </h3>
        <div className="w-48">
          <ShortFilmCard
            film={mockFilm}
            showPlayButton
            onClick={() => {}}
            onPlayTrailer={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          Not Available Online
        </h3>
        <div className="w-48">
          <ShortFilmCard
            film={mockFilmNoOnline}
            showPlayButton
            onClick={() => {}}
            onPlayTrailer={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          Minimal Data
        </h3>
        <div className="w-48">
          <ShortFilmCard
            film={mockFilmMinimal}
            showPlayButton
            onClick={() => {}}
            onPlayTrailer={() => {}}
          />
        </div>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "All card variants showcasing different film data states.",
      },
    },
  },
}
