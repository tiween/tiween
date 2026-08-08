/**
 * PlanningCalendarNew
 *
 * Integration layer between `BigCalendar` (UID-agnostic, reused verbatim) and
 * the events-manager data layer.
 *
 * Retargeted after story 2C.3: the single `showtime` collection is gone, so the
 * grid is fed by `useSubEvents`, which merges `screening` + `performance`
 * client-side. Every block carries its `kind` in `extendedProps`, and clicks are
 * routed on it — an edit can therefore never write to the wrong collection.
 */

import { useCallback, useMemo, useReducer, useState } from "react"
import { Box, Loader, Typography } from "@strapi/design-system"

import type { SubEvent } from "../../hooks/subEventTransform"
import type { CalendarEvent, CalendarView, SlotDuration } from "../BigCalendar"

import { readSubEvent, toCalendarEvents } from "../../hooks/subEventTransform"
import { usePlanningT } from "../../hooks/usePlanningT"
import { useSubEvents } from "../../hooks/useSubEvents"
import { BigCalendar } from "../BigCalendar"
import { addDays, startOfWeek } from "../BigCalendar/utils"
import { SubEventModal } from "../SubEventModal"

interface PlanningCalendarNewProps {
  venueId: string
  eventGroupId?: string
}

/**
 * One modal serves both directions, so the state is one slot: `subEvent` set
 * means edit, `date` set means create.
 */
interface CalendarState {
  modal: {
    isOpen: boolean
    date: Date | null
    subEvent: SubEvent | null
  }
}

type CalendarAction =
  | { type: "OPEN_CREATE_MODAL"; payload: Date }
  | { type: "OPEN_EDIT_MODAL"; payload: SubEvent }
  | { type: "CLOSE_MODAL" }

const initialState: CalendarState = {
  modal: { isOpen: false, date: null, subEvent: null },
}

function calendarReducer(
  state: CalendarState,
  action: CalendarAction
): CalendarState {
  switch (action.type) {
    case "OPEN_CREATE_MODAL":
      return {
        ...state,
        modal: { isOpen: true, date: action.payload, subEvent: null },
      }
    case "OPEN_EDIT_MODAL":
      return {
        ...state,
        modal: { isOpen: true, date: null, subEvent: action.payload },
      }
    case "CLOSE_MODAL":
      return { ...state, modal: { isOpen: false, date: null, subEvent: null } }
    default:
      return state
  }
}

export function PlanningCalendarNew({
  venueId,
  eventGroupId,
}: PlanningCalendarNewProps) {
  const t = usePlanningT()
  const [state, dispatch] = useReducer(calendarReducer, initialState)

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>("week")
  const [slotDuration, setSlotDuration] = useState<SlotDuration>(15)

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "day") {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      return { rangeStart: start, rangeEnd: addDays(start, 1) }
    }
    const start = startOfWeek(currentDate, 1) // Monday
    return { rangeStart: start, rangeEnd: addDays(start, 7) }
  }, [currentDate, view])

  const { subEvents, isLoading, error, partialError, refetch } = useSubEvents({
    venueId,
    eventGroupId,
    rangeStart,
    rangeEnd,
  })

  // Translated here, where the translator lives, and handed to the transform:
  // `EventBlock` renders the string it is given, so `BigCalendar` needs no
  // knowledge of sub-event kinds and no strings of its own.
  const mappingOptions = useMemo(
    () => ({
      kindLabels: {
        screening: t("badge.screening", "SCREENING"),
        performance: t("badge.performance", "THEATRE"),
      },
      fallbackTitle: t("untitled", "Untitled showing"),
    }),
    [t]
  )

  const events = useMemo(
    () => toCalendarEvents(subEvents, mappingOptions),
    [subEvents, mappingOptions]
  )

  const handleSlotClick = useCallback((date: Date) => {
    // Past slots open the modal like any other. The "no scheduling in the past"
    // rule lives in `validateSubEventForm` alone: enforcing it here as well
    // meant the same user could be silently refused by a click yet allowed to
    // pick yesterday in the DatePicker. One rule, one place — and a visible
    // field error instead of a click that appears to do nothing.
    dispatch({ type: "OPEN_CREATE_MODAL", payload: date })
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // The row travels with the block, so the modal opens against the collection
    // the block came from — no lookup, no chance of a kind mix-up.
    const subEvent = readSubEvent(event)
    if (subEvent) {
      dispatch({ type: "OPEN_EDIT_MODAL", payload: subEvent })
    }
  }, [])

  const handleModalClose = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" })
  }, [])

  // Replaces the old `setCurrentDate(new Date(currentDate))` nudge: the hook
  // exposes a real refetch, so the window no longer has to be churned to
  // reload it.
  const handleModalSuccess = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" })
    refetch()
  }, [refetch])

  if (error) {
    return (
      <Box padding={4} background="danger100" hasRadius>
        <Typography textColor="danger700">
          {t("loadFailed", "Failed to load showings")}
        </Typography>
      </Box>
    )
  }

  return (
    <>
      {/* One collection failing must never blank the grid — the kind that
          resolved still renders, with the failure surfaced above it. */}
      {partialError && (
        <Box padding={3} marginBottom={2} background="warning100" hasRadius>
          <Typography textColor="warning700">{partialError}</Typography>
        </Box>
      )}

      <Box position="relative">
        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            style={{ transform: "translate(-50%, -50%)", zIndex: 100 }}
          >
            <Loader>{t("loading", "Loading…")}</Loader>
          </Box>
        )}

        {!isLoading && events.length === 0 && (
          <Box padding={3} background="neutral100" hasRadius marginBottom={2}>
            <Typography textColor="neutral600">
              {t("empty", "No showing scheduled in this period")}
            </Typography>
          </Box>
        )}

        <Box style={{ opacity: isLoading ? 0.5 : 1 }}>
          <BigCalendar
            events={events}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            slotDuration={slotDuration}
            onSlotDurationChange={setSlotDuration}
            minTime="08:00"
            maxTime="24:00"
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            locale="fr-FR"
            firstDayOfWeek={1}
          />
        </Box>
      </Box>

      {state.modal.isOpen && (
        <SubEventModal
          isOpen={state.modal.isOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          venueId={venueId}
          prefilledDate={state.modal.date}
          subEvent={state.modal.subEvent}
        />
      )}
    </>
  )
}
