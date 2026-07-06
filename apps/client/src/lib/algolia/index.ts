export {
  searchShortsWithAlgolia,
  getShortsFacets,
  isAlgoliaConfigured,
  toAlgoliaRecord,
} from "./shorts"

export type { AlgoliaShortFilmRecord, AlgoliaSearchOptions } from "./shorts"

export {
  searchEventsWithAlgolia,
  toAlgoliaEventRecord,
  isAlgoliaEventsConfigured,
} from "./events"

export type {
  AlgoliaEventRecord,
  AlgoliaEventSearchOptions,
} from "./events"
