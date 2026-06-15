/**
 * Adapter exports and registry
 */

import type { CrawlOptions, SourceAdapter } from "../types.js"

import { TeskertiAdapter } from "./teskerti.js"
import { WikipediaArAdapter } from "./wikipedia-ar.js"
import { WikipediaAdapter } from "./wikipedia.js"

export { TeskertiAdapter } from "./teskerti.js"
export { WikipediaAdapter } from "./wikipedia.js"
export { WikipediaArAdapter } from "./wikipedia-ar.js"

/**
 * Registry of all available adapters
 */
export const ADAPTERS: Record<
  string,
  new (options?: CrawlOptions) => SourceAdapter
> = {
  teskerti: TeskertiAdapter,
  wikipedia: WikipediaAdapter,
  "wikipedia-ar": WikipediaArAdapter,
  // Future adapters:
  // 'theatre-national': TheatreNationalAdapter,
  // 'carthage-festival': CarthageFestivalAdapter,
}

/**
 * Get an adapter by name
 */
export function getAdapter(
  name: string,
  options?: CrawlOptions
): SourceAdapter | null {
  const AdapterClass = ADAPTERS[name]
  if (!AdapterClass) return null
  return new AdapterClass(options)
}

/**
 * Get all adapter names
 */
export function getAdapterNames(): string[] {
  return Object.keys(ADAPTERS)
}

/**
 * Create all adapters
 */
export function createAllAdapters(options?: CrawlOptions): SourceAdapter[] {
  return Object.values(ADAPTERS).map(
    (AdapterClass) => new AdapterClass(options)
  )
}
