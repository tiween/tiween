/**
 * Catalog enum options
 *
 * Mirrors the enumerations declared in the creative-works plugin schemas
 * (creative-work, components creative-works.credit / distinction /
 * theatre-details, common.link, common.video).
 */

import type { WorkType } from "../../hooks/useCreativeWorks"

export const WORK_TYPES: WorkType[] = ["film", "short-film", "play"]

export const CREDIT_ROLES = [
  "director",
  "playwright",
  "screenwriter",
  "adaptor",
  "translator",
  "composer",
  "musical-director",
  "choreographer",
  "cast",
  "set-designer",
  "costume-designer",
  "lighting-designer",
  "sound-designer",
  "projection-designer",
  "stage-manager",
  "producer",
  "executive-producer",
  "cinematographer",
  "editor",
  "other",
] as const

export const DISTINCTION_RESULTS = [
  "selected",
  "nominated",
  "winner",
  "special-mention",
  "honorable-mention",
  "grand-prize",
] as const

export const PLAY_TYPES = [
  "original",
  "adaptation",
  "revival",
  "translation",
  "devised",
] as const

export const PLAY_FORMATS = [
  "full-length",
  "one-act",
  "monologue",
  "sketch",
  "musical",
  "opera",
  "dance",
] as const

export const THEATRE_LANGUAGES = [
  "arabic",
  "darija",
  "french",
  "english",
  "arabic-french",
  "other",
] as const

export const AGE_RATINGS = ["TP", "PG12", "PG16", "PG18"] as const

export const LINK_TYPES = [
  "website",
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "tiktok",
  "linkedin",
  "vimeo",
  "spotify",
  "soundcloud",
  "whatsapp",
  "phone",
  "email",
  "imdb",
  "tmdb",
  "letterboxd",
  "allocine",
  "wikipedia",
  "maps",
  "booking",
  "other",
] as const

export const VIDEO_TYPES = ["TEASER", "CLIP", "FULL_LENGTH"] as const

/** Results that should render with a "success" badge in consult views */
export const WINNING_RESULTS = new Set([
  "winner",
  "grand-prize",
  "special-mention",
])
