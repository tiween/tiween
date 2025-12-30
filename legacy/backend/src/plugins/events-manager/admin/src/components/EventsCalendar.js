import "@fullcalendar/common/main.css"
import "@fullcalendar/daygrid/main.css"
import "@fullcalendar/timegrid/main.css"

import React, { memo, useReducer, useState } from "react"
import { Button } from "@strapi/design-system/Button"
import { Dialog, DialogBody, DialogFooter } from "@strapi/design-system/Dialog"
import { Flex } from "@strapi/design-system/Flex"
import { Stack } from "@strapi/design-system/Stack"
import { Typography } from "@strapi/design-system/Typography"
import { request, useNotification } from "@strapi/helper-plugin"
import ExclamationMarkCircle from "@strapi/icons/ExclamationMarkCircle"
import Trash from "@strapi/icons/Trash"
import fullCalendarFrenchLocale from "@fullcalendar/core/locales/fr"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import momentTimezonePlugin from "@fullcalendar/moment-timezone"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { get, isEmpty, memoize } from "lodash"
import { DateTime } from "luxon"
import PropTypes from "prop-types"
import {
  BiTrash as DeleteIcon,
  BiVolumeLow as LanguageIcon,
} from "react-icons/bi"

import pluginId from "../pluginId"
import EventSettings from "./EventSettings"
import { StyledCalendarEvent, StyledEventsCalendar } from "./styles"

const reducer = (state, action) => {
  switch (action.type) {
    case "delete.confirm":
      return {
        displayWarning: true,
        displayShowtimeSettings: false,
        eventToDelete: action.payload.id,
        warning: {
          title: `${pluginId}.showtimes.calendar.delete.showtime`,
          message: `${pluginId}.showtimes.calendar.delete.showtime.message`,
          confirm: `${pluginId}.showtimes.calendar.delete.showtime.confirm`,
          cancel: `${pluginId}.showtimes.calendar.delete.showtime.cancel`,
        },
      }
    case "add.start": {
      return {
        displayWarning: false,
        displayShowtimeSettings: true,
        date: action.payload.date,
      }
    }
    default:
      return {
        displayWarning: false,
        displayShowtimeSettings: false,
      }
  }
}
const EventsCalendar = (props) => {
  const { selectedMedium, selectedEventGroup, mode } = props
  const [state, dispatch] = useReducer(reducer, {
    displayWarning: false,
    displayShowtimeSettings: false,
  })

  const toggleNotification = useNotification()

  const toggleEventSettings = () => {
    dispatch({ type: "add.success" })
  }
  const renderEvent = (info) => {
    const eventGroup = get(info, ["event", "event_group"], null)

    return (
      <StyledCalendarEvent>
        <div className="d-flex justify-content-between">
          <i>{info.timeText}</i>
          <button
            className="btn btn-link p-0 delete-showtime"
            style={{ color: "white", textDecoration: "none" }}
            onClick={(event) => {
              event.stopPropagation()
              dispatch({
                type: "delete.confirm",
                payload: { id: info.event.id },
              })
              setIsVisible(true)
              return false
            }}
          >
            <DeleteIcon />
          </button>
        </div>
        <b>{info.event.title}</b>
        <ul
          className="list-unstyled pl-1"
          style={{ position: "relative", bottom: 0 }}
        >
          <li className="text-uppercase">
            <span>
              <LanguageIcon />
              {info.event.extendedProps.language}
            </span>
          </li>
          {eventGroup ? (
            <li className="text-uppercase">
              <span>{eventGroup.shortTitle}</span>
            </li>
          ) : (
            <></>
          )}
        </ul>
      </StyledCalendarEvent>
    )
  }

  const fetchEvents = (info) => {
    if (isEmpty(selectedMedium)) {
      return
    }
    const { endStr: endDate, startStr: startDate } = info

    const params = {
      endDate,
      startDate,
      _limit: -1,
    }

    if (!isEmpty(selectedMedium)) {
      params["medium"] = selectedMedium.value
    }

    return request("/events-manager/events", {
      method: "GET",
      params,
    })
  }
  // const memoizedfetchEvents = memoize(fetchEvents);

  const eventDataTransform = memoize((eventData) => {
    const start = get(eventData, "fullStartDate", null)
    const runtime = get(eventData, "runtime", 0)
    const end = DateTime.fromISO(start).plus({ minutes: runtime }).toJSDate()

    const transformedEventData = {
      id: eventData.id,
      title: eventData.title,
      start: start,
      end: end,
      backgroundColor: get(eventData, ["colors", "DarkVibrant", "hex"], ""),
      borderColor: get(eventData, ["colors", "DarkMuted", "hex"], ""),
    }

    return transformedEventData
  })

  const dateClick = (info) => {
    if (isEmpty(selectedMedium)) {
      toggleNotification({
        type: "warning",
        blockTransition: true,
        message: { id: `${pluginId}.events.calendar.error.no.medium.message` },
      })
      return false
    }
    const { dateStr } = info
    toggleEventSettings()
    dispatch({ type: "add.start", payload: { date: dateStr } })
  }
  const [isVisible, setIsVisible] = useState(true)
  const [ctrlIsPressed, setCtrlIsPressed] = useState(false)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Control") {
        setCtrlIsPressed(true)
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === "Control") {
        setCtrlIsPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])
  const currentDate = DateTime.now().toFormat("yyyy-MM-dd")
  const visibleRangeEndDate = DateTime.fromISO(currentDate)
    .plus({ months: 4 })
    .toFormat("yyyy-MM-dd")

  return (
    <>
      {state.displayWarning && (
        <Dialog
          onClose={() => {
            setIsVisible(false)
          }}
          title="Confirmation"
          isOpen={isVisible}
        >
          <DialogBody icon={<ExclamationMarkCircle />}>
            <Stack spacing={2}>
              <Flex justifyContent="center">
                <Typography id="confirm-description">
                  Voulez vous supprimer cet évenement?
                </Typography>
              </Flex>
            </Stack>
          </DialogBody>
          <DialogFooter
            startAction={
              <Button
                onClick={() => {
                  setIsVisible(false)
                  console.log(state.displayWarning)
                }}
                variant="tertiary"
              >
                Annuler
              </Button>
            }
            endAction={
              <Button
                variant="danger-light"
                startIcon={<Trash />}
                onClick={async () => {
                  if (state.eventToDelete) {
                    await request(
                      `/events-manager/events/${state.eventToDelete}`,
                      { method: "DELETE" }
                    )
                    setIsVisible(false)
                  }
                }}
              >
                Confirmer
              </Button>
            }
          />
        </Dialog>
      )}
      <StyledEventsCalendar>
        <FullCalendar
          nowIndicator={true}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            momentTimezonePlugin,
          ]}
          eventContent={renderEvent}
          events={fetchEvents}
          eventDataTransform={eventDataTransform}
          validRange={() => {
            return {
              start: currentDate,
              end: visibleRangeEndDate,
            }
          }}
          firstDay={DateTime.now().weekday}
          initialView="timeGridWeek"
          slotDuration="00:05:00"
          allDaySlot={false}
          stickyHeaderDates={true}
          timeZone="Africa/Tunis"
          height="auto"
          themeSystem="bootstrap"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={fullCalendarFrenchLocale}
          dateClick={dateClick}
          slotMinTime="10:00:00"
        />
      </StyledEventsCalendar>
      <EventSettings
        medium={selectedMedium}
        eventGroup={selectedEventGroup}
        start={state.date}
        isOpen={state.displayShowtimeSettings}
        onClosed={() => {
          dispatch({ type: "add.done" })
        }}
        onToggle={toggleEventSettings}
      />
    </>
  )
}

EventsCalendar.propTypes = {
  selectedMedium: PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  }),
  selectedEventGroup: PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  }),
}

export default memo(EventsCalendar)
