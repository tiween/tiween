/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react"
import isEmpty from "lodash/isEmpty"
import { DateTime } from "luxon"

import DatesList from "../DatesSelector/DatesList"
import ShowtimesList from "../Showtimes/ShowtimesList"

type BaseTimetableProps = {
  timetable: unknown
}
const sortDateTimes = (a, b): number => (a < b ? -1 : a > b ? 1 : 0)

const BaseTimetable: React.FC<BaseTimetableProps> = ({ timetable }) => {
  const dates = useMemo(() => {
    return timetable ? Object.keys(timetable) : []
  }, [timetable])

  const sortedDatesAsObjects = useMemo(() => {
    return dates
      ?.map((date) => DateTime.fromISO(date))
      .sort(sortDateTimes)
      .map((date) => date.toFormat("yyyy-MM-dd"))
  }, [dates])
  const [selectedDate, setSelectedDate] = useState(sortedDatesAsObjects[0])

  return (
    <div className="mt-8">
      <DatesList
        {...{
          dates: sortedDatesAsObjects,
          selected: selectedDate,
          handleSelectDate: setSelectedDate,
        }}
      />

      {!isEmpty(timetable) && (
        <div className="mt-8 pb-10">
          <ShowtimesList timetable={timetable} selectedDate={selectedDate} />
        </div>
      )}
    </div>
  )
}

export default React.memo(BaseTimetable)
