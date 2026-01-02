import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { storyPosters } from "@/lib/storybook/tmdb-posters"

import { FilmCard } from "./FilmCard"
import { FilmCardSkeleton } from "./FilmCardSkeleton"

// Film data using real TMDB movie posters
const dummyFilm = {
  id: "1",
  title: "Dune: Part Two",
  originalTitle: "Dune: Part Two",
  posterUrl: storyPosters.film.dune,
  slug: "dune-part-two",
}

const dummyFilmWithArabicTitle = {
  id: "2",
  title: "Le Festin de Babette",
  originalTitle: "وليمة بابيت",
  posterUrl: storyPosters.film.babette,
  slug: "le-festin-de-babette",
}

const dummyFilmLongTitle = {
  id: "3",
  title: "Pirates des Caraïbes: La Vengeance de Salazar",
  originalTitle: "Pirates of the Caribbean: Dead Men Tell No Tales",
  posterUrl: storyPosters.film.gladiator,
  slug: "pirates-des-caraibes-la-vengeance-de-salazar",
}

const meta = {
  title: "Features/Films/FilmCard",
  component: FilmCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    film: {
      description: "Film data to display",
    },
    showPlayTrailerButton: {
      control: "boolean",
      description: "Show play trailer button on hover",
    },
    isLoading: {
      control: "boolean",
      description: "Show loading skeleton",
    },
    onPlayTrailer: {
      action: "onPlayTrailer",
      description: "Called when play trailer button is clicked",
    },
    onClick: {
      action: "onClick",
      description: "Called when card/CTA button is clicked",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    labels: {
      description: "Localized labels for i18n",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[185px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilmCard>

export default meta
type Story = StoryObj<typeof meta>

// Default story
export const Default: Story = {
  args: {
    film: dummyFilm,
    showPlayTrailerButton: false,
  },
}

// With play trailer button
export const WithTrailerButton: Story = {
  args: {
    film: dummyFilm,
    showPlayTrailerButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Film card with play trailer button visible on hover.",
      },
    },
  },
}

// Arabic original title
export const ArabicTitle: Story = {
  args: {
    film: dummyFilmWithArabicTitle,
    showPlayTrailerButton: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Film card with Arabic original title displayed below the French title.",
      },
    },
  },
}

// Long title
export const LongTitle: Story = {
  args: {
    film: dummyFilmLongTitle,
    showPlayTrailerButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Film card with a long title to test text wrapping.",
      },
    },
  },
}

// Loading state
export const Loading: Story = {
  args: {
    film: dummyFilm,
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Loading state showing skeleton placeholder.",
      },
    },
  },
}

// RTL mode
export const RTLMode: Story = {
  args: {
    film: {
      id: "4",
      title: "فيلم عربي",
      originalTitle: "Un Film Arabe",
      posterUrl: storyPosters.film.capernaum,
      slug: "film-arabe",
    },
    showPlayTrailerButton: true,
    labels: {
      showtimes: "الحصص",
      playTrailer: "شاهد الإعلان",
    },
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="w-[185px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Film card in RTL mode with Arabic content.",
      },
    },
  },
}

// Interactive story showing hover states
export const Interactive: Story = {
  args: {
    film: dummyFilm,
    showPlayTrailerButton: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Hover over the card to see the overlay animation. On desktop, the poster dims and the overlay with title, play button, and CTA fades in.",
      },
    },
  },
}

// Grid layout showing multiple cards (homepage layout)
export const Grid: Story = {
  args: {
    film: dummyFilm,
    showPlayTrailerButton: true,
  },
  decorators: [
    () => (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <FilmCard
          film={dummyFilm}
          showPlayTrailerButton
          onClick={() => {}}
          onPlayTrailer={() => {}}
        />
        <FilmCard
          film={dummyFilmWithArabicTitle}
          showPlayTrailerButton
          onClick={() => {}}
          onPlayTrailer={() => {}}
        />
        <FilmCard
          film={{
            id: "5",
            title: "Gladiator II",
            posterUrl: storyPosters.film.gladiator,
            slug: "gladiator-2",
          }}
          showPlayTrailerButton
          onClick={() => {}}
          onPlayTrailer={() => {}}
        />
        <FilmCard
          film={{
            id: "6",
            title: "Joker: Folie à Deux",
            posterUrl: storyPosters.film.joker,
            slug: "joker-folie-a-deux",
          }}
          showPlayTrailerButton
          onClick={() => {}}
          onPlayTrailer={() => {}}
        />
        <FilmCard
          film={{
            id: "7",
            title: "Furiosa",
            posterUrl: storyPosters.film.furiosa,
            slug: "furiosa",
          }}
          showPlayTrailerButton
          onClick={() => {}}
          onPlayTrailer={() => {}}
        />
      </div>
    ),
  ],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Multiple film cards in a responsive grid layout.",
      },
    },
  },
}

// Skeleton variants
export const SkeletonGrid: Story = {
  args: {
    film: dummyFilm,
  },
  decorators: [
    () => (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <FilmCardSkeleton />
        <FilmCardSkeleton />
        <FilmCardSkeleton />
        <FilmCardSkeleton />
        <FilmCardSkeleton />
      </div>
    ),
  ],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Loading skeleton grid matching the film card grid layout.",
      },
    },
  },
}

// Custom labels (i18n)
export const CustomLabels: Story = {
  args: {
    film: dummyFilm,
    showPlayTrailerButton: true,
    labels: {
      showtimes: "Horaires",
      playTrailer: "Regarder la bande-annonce",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Film card with custom localized labels.",
      },
    },
  },
}
