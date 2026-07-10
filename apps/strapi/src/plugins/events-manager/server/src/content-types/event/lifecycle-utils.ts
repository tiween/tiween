/**
 * Pure id-resolution seam for the event schedule-change lifecycle (Story 5.6).
 *
 * Extracted so the (boot-level, untested) lifecycle subscriber stays thin while
 * the risk-bearing resolution is unit-tested. Collects the distinct creative-
 * work documentIds attached to an event via its `screenings[].movie` and
 * `performances[].play` relations (the watchlist targets `creative-work`).
 */

interface CreativeWorkRef {
  documentId?: string | null
}

interface WithMovie {
  movie?: CreativeWorkRef | null
}

interface WithPlay {
  play?: CreativeWorkRef | null
}

interface EventRow {
  screenings?: WithMovie[] | null
  performances?: WithPlay[] | null
}

/**
 * Deduped list of the creative-work documentIds a schedule change affects. An
 * event with no screenings/performances (or none with a resolvable work) yields
 * an empty array.
 */
export function collectWatchedCreativeWorkIds(event: EventRow): string[] {
  const ids = new Set<string>()

  for (const screening of event.screenings ?? []) {
    const id = screening?.movie?.documentId
    if (id) ids.add(id)
  }

  for (const performance of event.performances ?? []) {
    const id = performance?.play?.documentId
    if (id) ids.add(id)
  }

  return Array.from(ids)
}
