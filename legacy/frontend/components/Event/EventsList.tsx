import * as React from "react"

import useRequest from "../../shared/hooks/useRequest"
import Event from "../../shared/models/event"
import EventBlock from "./EventBlock"

interface IEventsListProps {
  date: string
  eventGroupId: string
}

const EventsList: React.FunctionComponent<IEventsListProps> = ({
  date,
  eventGroupId,
}) => {
  const { data: events } = useRequest<Event[]>({
    url: `/api/event-group/events/${date}/${eventGroupId}`,
  })
  return (
    <div className="">
      <div className="events-list flex flex-col space-y-2">
        {!events && <div>Chargement...</div>}
        {events && events?.length > 0 && (
          <>
            {events.map((event) => {
              return <EventBlock key={event.id} event={event} />
            })}
          </>
        )}
      </div>
    </div>
  )
}

export default EventsList
