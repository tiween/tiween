import type { Meta, StoryObj } from "@storybook/react"
import type { FilmHeroEvent } from "./FilmHero"

import { FilmHero } from "./FilmHero"

const meta: Meta<typeof FilmHero> = {
  title: "Features/Events/FilmHero",
  component: FilmHero,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-bleed hero component for event detail pages. Displays event information with visual impact including backdrop image, title, metadata, and action buttons.",
      },
    },
  },
  argTypes: {
    event: {
      description: "Event data to display",
    },
    isWatchlisted: {
      control: "boolean",
      description: "Whether the event is in the user's watchlist",
    },
    onWatchlist: {
      action: "watchlist toggled",
      description: "Called when watchlist button is clicked",
    },
    onShare: {
      action: "share clicked",
      description: "Called when share button is clicked",
    },
  },
}

export default meta
type Story = StoryObj<typeof FilmHero>

// Sample film data
const sampleFilm: FilmHeroEvent = {
  id: "1",
  title: "Inception",
  backdropUrl:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=800&fit=crop",
  category: "Cinéma",
  genres: ["Sci-Fi", "Action", "Thriller"],
  rating: 8.8,
  duration: 148,
  year: 2010,
  venueCount: 5,
}

const arabicFilm: FilmHeroEvent = {
  id: "2",
  title: "الهيبة",
  backdropUrl:
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop",
  category: "Cinéma",
  genres: ["دراما", "إثارة"],
  rating: 7.5,
  duration: 120,
  year: 2023,
  venueCount: 3,
}

const theatreEvent: FilmHeroEvent = {
  id: "3",
  title: "Le Malade Imaginaire",
  backdropUrl:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&h=800&fit=crop",
  category: "Théâtre",
  genres: ["Comédie", "Classique"],
  duration: 90,
  year: 2024,
  venueCount: 2,
}

const musicEvent: FilmHeroEvent = {
  id: "4",
  title: "Festival Jazz de Tunis",
  backdropUrl:
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=800&fit=crop",
  category: "Musique",
  genres: ["Jazz", "World Music"],
  year: 2024,
  venueCount: 1,
}

/**
 * Default story - Film with all metadata
 */
export const Default: Story = {
  args: {
    event: sampleFilm,
    isWatchlisted: false,
  },
}

/**
 * With Rating - Shows star rating display
 */
export const WithRating: Story = {
  args: {
    event: sampleFilm,
    isWatchlisted: false,
  },
}

/**
 * No Rating - Event without rating (like theatre/music)
 */
export const NoRating: Story = {
  args: {
    event: theatreEvent,
    isWatchlisted: false,
  },
}

/**
 * Multiple Genres - Shows genre badge overflow
 */
export const MultipleGenres: Story = {
  args: {
    event: {
      ...sampleFilm,
      genres: ["Sci-Fi", "Action", "Thriller", "Drama", "Mystery"],
    },
    isWatchlisted: false,
  },
}

/**
 * Watchlisted - Shows filled heart icon
 */
export const Watchlisted: Story = {
  args: {
    event: sampleFilm,
    isWatchlisted: true,
  },
}

/**
 * Theatre Event - Different category styling
 */
export const TheatreEvent: Story = {
  args: {
    event: theatreEvent,
    isWatchlisted: false,
  },
}

/**
 * Music Event - Music category variant
 */
export const MusicEvent: Story = {
  args: {
    event: musicEvent,
    isWatchlisted: false,
  },
}

/**
 * RTL Mode - Arabic content for RTL testing
 */
export const RTL: Story = {
  args: {
    event: arabicFilm,
    isWatchlisted: false,
    labels: {
      addToWatchlist: "أضف إلى قائمة المتابعة",
      removeFromWatchlist: "إزالة من قائمة المتابعة",
      share: "مشاركة",
      inVenues: (count) => `في ${count} قاعة`,
      minutes: "دقيقة",
    },
  },
  parameters: {
    direction: "rtl",
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
 * Long Title - Tests title truncation
 */
export const LongTitle: Story = {
  args: {
    event: {
      ...sampleFilm,
      title:
        "Once Upon a Time in Hollywood: A Quentin Tarantino Film About the Golden Age of Movies",
    },
    isWatchlisted: false,
  },
}

/**
 * Minimal Data - Only required fields
 */
export const MinimalData: Story = {
  args: {
    event: {
      id: "5",
      title: "Upcoming Event",
      category: "Cinéma",
    },
    isWatchlisted: false,
  },
}

/**
 * No Image - Fallback placeholder
 */
export const NoImage: Story = {
  args: {
    event: {
      ...sampleFilm,
      backdropUrl: undefined,
    },
    isWatchlisted: false,
  },
}
