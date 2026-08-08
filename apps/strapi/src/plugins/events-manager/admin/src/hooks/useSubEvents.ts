/**
 * useSubEvents
 *
 * Fetches both sub-event collections (`screening`, `performance`) for a date
 * range at one venue and merges them into a single chronological list.
 *
 * There is no server-side union endpoint, so the two `GET`s run in parallel
 * under `Promise.allSettled`: one collection failing degrades the calendar to a
 * partial render (the kind that resolved, plus a non-blocking `partialError`)
 * instead of blanking the week. Only a total failure sets `error`.
 *
 * Replaces `useShowtimes`, which targeted the `showtime` collection — a
 * content type story 2C.3 deleted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

import type { SubEventKind } from "./subEventPopulate"
import type { RawSubEvent, SubEvent } from "./subEventTransform"
import type { Pagination } from "./useVenuesEnhanced"

import {
  cmUrl,
  SUB_EVENT_KINDS,
  SUB_EVENT_UID,
  subEventPopulate,
} from "./subEventPopulate"
import { mergeSubEvents, normalizeSubEvents } from "./subEventTransform"
import { usePlanningT } from "./usePlanningT"

/**
 * One page per collection. A week that overflows this needs a server-side union
 * endpoint (an API change, out of scope here) — so overflow is reported through
 * `partialError` rather than silently truncated.
 */
const PAGE_SIZE = 500

interface ListResponse {
  results: RawSubEvent[]
  pagination?: Pagination
}

export interface UseSubEventsOptions {
  /** Numeric venue id (as selected in the planning header). */
  venueId: string | number | null | undefined
  /** Optional event-group filter, applied through the parent event. */
  eventGroupId?: string | number | null
  /** Inclusive start of the visible window. */
  rangeStart: Date
  /** Exclusive end of the visible window — filtered with `$lt`, not `$lte`. */
  rangeEnd: Date
  enabled?: boolean
}

export interface UseSubEventsResult {
  subEvents: SubEvent[]
  isLoading: boolean
  /** Both collections failed — the calendar has nothing to show. */
  error: Error | null
  /** One collection failed, or a page overflowed: render, but warn. */
  partialError: string | null
  refetch: () => void
}

export function useSubEvents({
  venueId,
  eventGroupId,
  rangeStart,
  rangeEnd,
  enabled = true,
}: UseSubEventsOptions): UseSubEventsResult {
  const { get } = useFetchClient()
  const t = usePlanningT()

  const [subEvents, setSubEvents] = useState<SubEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  // Held as data, not as a rendered sentence: the fetch callback must not
  // depend on the translator, or a provider re-render would re-key it and
  // retrigger both requests.
  const [degraded, setDegraded] = useState<{
    failed: SubEventKind[]
    truncated: SubEventKind[]
  } | null>(null)

  // Two requests race on every window change (both collections, and the user
  // can page the calendar faster than they resolve). Only the newest run is
  // allowed to write state, so a slow earlier week cannot repaint over a newer
  // one.
  const runIdRef = useRef(0)

  // Date objects are new on every render of the caller's `useMemo`, so the
  // effect keys off the ISO strings instead — identical windows then do not
  // retrigger a fetch.
  const startIso = rangeStart.toISOString()
  const endIso = rangeEnd.toISOString()

  const fetchSubEvents = useCallback(async () => {
    const runId = ++runIdRef.current
    const isStale = () => runId !== runIdRef.current

    if (!enabled || !venueId) {
      // Same stale guard as the main path: this branch runs on a venue
      // DESELECTION, which can land after a newer run has already painted rows.
      // Without the check it would clear results the newer run just set.
      if (isStale()) return
      setSubEvents([])
      setIsLoading(false)
      setError(null)
      setDegraded(null)
      return
    }

    setIsLoading(true)
    setError(null)
    setDegraded(null)

    // Neither sub-event type has a `venue` relation of its own: the venue hangs
    // off the parent event, so the filter has to travel through it.
    // `$lt`, not `$lte`: `rangeEnd` is exclusive (next Monday 00:00 in week
    // view, next midnight in day view). With `$lte`, a showing at exactly that
    // instant is returned for BOTH adjacent windows — it appears twice as the
    // user pages, and in day view on two consecutive days. The old query used
    // `$lte`; that was part of what this rebuild is fixing.
    const filters: Record<string, unknown> = {
      startDateTime: { $gte: startIso, $lt: endIso },
      event: {
        venue: { id: venueId },
        ...(eventGroupId ? { eventGroup: { id: eventGroupId } } : {}),
      },
    }

    let settled: PromiseSettledResult<{ data: ListResponse }>[]
    try {
      settled = await Promise.allSettled(
        SUB_EVENT_KINDS.map((kind) =>
          get<ListResponse>(cmUrl(SUB_EVENT_UID[kind]), {
            params: {
              page: 1,
              pageSize: PAGE_SIZE,
              sort: "startDateTime:asc",
              populate: subEventPopulate(kind),
              filters,
            },
          })
        )
      )
    } catch (err) {
      // `allSettled` does not reject, so reaching here means the fetch client
      // itself threw synchronously. Without this the spinner would never stop.
      console.error("[planning] sub-event fetch could not be issued", err)
      if (isStale()) return
      setSubEvents([])
      setError(new Error("SUB_EVENTS_LOAD_FAILED"))
      setIsLoading(false)
      return
    }

    if (isStale()) return

    const failedKinds: SubEventKind[] = []
    const truncatedKinds: SubEventKind[] = []
    const lists: SubEvent[][] = []

    settled.forEach((outcome, index) => {
      const kind = SUB_EVENT_KINDS[index]

      if (outcome.status === "rejected") {
        // The reason is the only diagnostic there is: the UI shows a generic
        // warning, so without this line a failing collection is invisible from
        // the console too.
        console.error(`[planning] failed to load ${kind}s`, outcome.reason)
        failedKinds.push(kind)
        lists.push([])
        return
      }

      const payload = outcome.value?.data
      const results = payload?.results

      // A fulfilled response with an unexpected body (a proxy error page, a
      // shape change) would otherwise throw HERE, inside the async callback,
      // leaving `isLoading` true forever — a permanent spinner over an empty
      // grid. Treat it as this collection failing.
      if (!Array.isArray(results)) {
        console.error(`[planning] unexpected ${kind} response body`, payload)
        failedKinds.push(kind)
        lists.push([])
        return
      }

      // `total` is the reliable signal, but a server that omits pagination
      // while returning a full page is also truncating — just silently.
      const total = payload?.pagination?.total
      if (
        typeof total === "number"
          ? total > PAGE_SIZE
          : results.length >= PAGE_SIZE
      ) {
        truncatedKinds.push(kind)
      }

      lists.push(normalizeSubEvents(kind, results))
    })

    if (failedKinds.length === SUB_EVENT_KINDS.length) {
      setSubEvents([])
      // A code, not a sentence — the caller renders the translated string.
      setError(new Error("SUB_EVENTS_LOAD_FAILED"))
      setIsLoading(false)
      return
    }

    setSubEvents(mergeSubEvents(...lists))
    setDegraded(
      failedKinds.length > 0 || truncatedKinds.length > 0
        ? { failed: failedKinds, truncated: truncatedKinds }
        : null
    )
    setIsLoading(false)
  }, [get, enabled, venueId, eventGroupId, startIso, endIso])

  useEffect(() => {
    fetchSubEvents()
  }, [fetchSubEvents])

  const partialError = useMemo(() => {
    if (!degraded) return null

    // Reuse the badge labels rather than joining raw `SubEventKind` values:
    // otherwise an Arabic admin reads an Arabic sentence with "screening,
    // performance" appended in English enum spelling.
    const label = (kind: SubEventKind) =>
      kind === "screening"
        ? t("badge.screening", "SCREENING")
        : t("badge.performance", "THEATRE")

    const list = (kinds: SubEventKind[]) => kinds.map(label).join(", ")

    const parts: string[] = []
    if (degraded.failed.length > 0) {
      parts.push(
        `${t(
          "partial.failed",
          "Some showings could not be loaded"
        )} (${list(degraded.failed)}).`
      )
    }
    if (degraded.truncated.length > 0) {
      parts.push(
        `${t(
          "partial.truncated",
          "Too many showings in this period — the list is truncated"
        )} (${list(degraded.truncated)}).`
      )
    }
    return parts.join(" ")
  }, [degraded, t])

  return { subEvents, isLoading, error, partialError, refetch: fetchSubEvents }
}
