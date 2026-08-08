import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { ShortFilm } from "../../types"

import { ShortFilmDetail } from "./ShortFilmDetail"

/**
 * `.storybook/preview.tsx` already wraps every story in a
 * `NextIntlClientProvider` fed by the REAL `fr.json` / `ar.json` catalogs and
 * flips `dir` from the "Direction" toolbar global — so the RTL story below is
 * genuine Arabic copy in a genuine RTL frame, not a stub.
 */
const meta = {
  title: "Features/Shorts/ShortFilmDetail",
  component: ShortFilmDetail,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ShortFilmDetail>

export default meta
type Story = StoryObj<typeof meta>

const fullFilm: ShortFilm = {
  id: 1,
  documentId: "communion-001",
  title: "Communion",
  originalTitle: "تواصل",
  slug: "communion",
  synopsis:
    "À la veille d'un enterrement, trois générations d'une même famille se retrouvent dans la maison de Sidi Bou Saïd. Entre rancœurs tues et tendresse retrouvée, une nuit suffit pour que les masques tombent — et qu'une forme de communion renaisse.",
  duration: 21,
  releaseYear: 2024,
  rating: 4.8,
  ageRating: "PG12",
  poster: {
    url: "https://i.ytimg.com/vi/9joWma-XKcQ/maxresdefault.jpg",
    alternativeText: "Communion poster",
  },
  backdrop: {
    url: "https://i.ytimg.com/vi/9joWma-XKcQ/maxresdefault.jpg",
    alternativeText: "Communion backdrop",
  },
  trailer: "https://www.youtube.com/watch?v=example",
  genres: [
    { id: 1, documentId: "g1", name: "Drame", slug: "drame" },
    { id: 2, documentId: "g2", name: "Famille", slug: "famille" },
  ],
  directors: [
    { id: 1, documentId: "p1", name: "Yasmine Ben Ali", slug: "yasmine" },
  ],
  cast: [
    {
      person: { id: 10, documentId: "p10", name: "Hend Sabri", slug: "hend" },
      role: "Leïla",
    },
    {
      person: {
        id: 11,
        documentId: "p11",
        name: "Dhafer L'Abidine",
        slug: "dhafer",
      },
      role: "Sami",
    },
    {
      person: {
        id: 12,
        documentId: "p12",
        name: "Fatma Ben Saïdane",
        slug: "fatma",
      },
    },
  ],
  streamingLinks: [
    { platform: "youtube", url: "https://www.youtube.com/watch?v=example" },
    { platform: "vimeo", url: "https://vimeo.com/example" },
  ],
  awards: [
    {
      name: "Sélection officielle",
      category: "JCC Carthage",
      year: 2024,
      won: false,
    },
    { name: "Prix du jury", category: "Clermont-Ferrand", won: true },
  ],
  country: "Tunisie",
  language: "Arabe tunisien",
}

const relatedShorts: ShortFilm[] = [
  {
    id: 2,
    documentId: "brotherhood-002",
    title: "Brotherhood",
    slug: "brotherhood",
    poster: { url: "https://i.ytimg.com/vi/zjJjkSHNRx4/maxresdefault.jpg" },
    duration: 25,
    releaseYear: 2018,
    rating: 4.8,
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
  },
  {
    id: 3,
    documentId: "wissam-003",
    title: "Wissam",
    slug: "wissam",
    poster: { url: "https://i.ytimg.com/vi/Au2uDZgmGgs/maxresdefault.jpg" },
    duration: 9,
    releaseYear: 2021,
    rating: 4.7,
    genres: [{ id: 6, documentId: "g6", name: "Animation", slug: "animation" }],
  },
  {
    id: 4,
    documentId: "refuge-004",
    title: "Refuge",
    slug: "refuge",
    duration: 22,
    releaseYear: 2023,
    rating: 4.4,
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
  },
]

/** Every in-scope section present: awards, streaming, cast, related. */
export const Full: Story = {
  args: { film: fullFilm, relatedShorts },
}

/**
 * The floor: no media, no awards, no streaming, no trailer, no cast, no
 * related. Only the hero (striped fill + ت glyph) and the synopsis render —
 * no play affordance, no watch CTA, no sticky bar, no empty shells.
 */
export const Minimal: Story = {
  args: {
    film: {
      id: 9,
      documentId: "minimal-009",
      title: "Sans titre",
      slug: "sans-titre",
      synopsis: "Un court métrage dont la fiche est encore incomplète.",
    },
  },
}

/**
 * AR-RTL: the preview decorator supplies `ar.json` and an RTL frame, and the
 * whole page mirrors through logical properties alone.
 */
export const ArabicRTL: Story = {
  args: { film: fullFilm, relatedShorts },
  globals: { direction: "rtl" },
}

/**
 * Trailer only — no streaming links. The primary CTA falls back to the
 * trailer, so the sticky bar is still present but the separate
 * "Bande-annonce" button is dropped as a duplicate.
 */
export const TrailerOnly: Story = {
  args: {
    film: { ...fullFilm, streamingLinks: [], awards: [] },
    relatedShorts,
  },
}

/**
 * Nothing to watch: no streaming links and no trailer. Review this one for the
 * absent states — no hero play disc, no watch CTA and **no sticky bar**.
 */
export const NoWatchTarget: Story = {
  args: {
    film: { ...fullFilm, streamingLinks: [], trailer: undefined },
    relatedShorts,
  },
}
