// import classNames from 'classnames';
// import get from 'lodash/get';
// import Link from 'next/link';
import React, { useState } from "react"

import { useEventGroup } from "../../shared/context/EventGroupContext"
import useRequest from "../../shared/hooks/useRequest"
import DatesList from "../DatesSelector/DatesList"
import EventsList from "./EventsList"

const EventGroupCalendar: React.FC = () => {
  const eventGroup = useEventGroup()
  const [selectedDate, setSelectedDate] = useState(null)
  const { data: dates } = useRequest<string[]>({
    url: `/api/event-group/events/dates/${eventGroup.id}`,
  })

  return (
    <div className="events-list relative flex flex-col space-y-2">
      {!dates && <div>Chargement...</div>}
      {dates && dates?.length > 0 && (
        <>
          <div className="sticky md:top-24 top-24  z-20">
            <DatesList
              {...{
                dates,
                selected: selectedDate || dates[0],
                handleSelectDate: setSelectedDate,
              }}
            />
          </div>
          <div className="px-2">
            <EventsList
              eventGroupId={eventGroup.id}
              date={selectedDate || dates[0]}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default EventGroupCalendar
