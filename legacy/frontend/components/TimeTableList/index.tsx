import React from "react"
import get from "lodash/get"
import { DateTime } from "luxon"

import { useMovie } from "../../shared/context/movie.context"
import { Show } from "../../shared/models/show"
import TimetableItem from "./TimeTableItem"

const TimeTableList: React.FC<{ shows: Show[]; withMedium?: boolean }> = ({
  shows,
  withMedium = false,
}) => {
  console.log("shows", shows)
  let dateField = "date"
  if ("fullStartDate" in shows[0]) {
    dateField = "fullStartDate"
  }
  const moviemeta = useMovie()
  return (
    <div className="gap-3 grid md:grid-cols-3 grid-cols-2 grid-flow-row ">
      {shows
        .sort((timeItem1, timeItem2) => {
          return (
            DateTime.fromISO(get(timeItem1, [dateField], "")).millisecond -
            DateTime.fromISO(get(timeItem2, [dateField], "")).millisecond
          )
        })
        .map((show) => {
          show.date = get(show, ["attributes", dateField], "")
          return (
            <TimetableItem
              show={show}
              key={show.id}
              withMedium={withMedium}
              runtime={moviemeta.remote.runtime}
            />
          )
        })}
    </div>
  )
}
export default TimeTableList
