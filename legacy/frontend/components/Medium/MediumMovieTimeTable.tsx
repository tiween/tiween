import React from "react"
import Link from "next/link"
import LocationIcon from "@heroicons/react/solid/LocationMarkerIcon"

import { Medium } from "../../shared/models/medium"
import { Show } from "../../shared/models/show"
import MediumAttributes from "../MediumAttributes"
import MovieTimeTable from "../TimeTableList"

const MediumMovieTimeTable: React.FC<{
  selectedDate: string
  mediumTimeTable: {
    medium: Medium
    shows: Show[]
  }
}> = ({ mediumTimeTable }) => {
  const medium = mediumTimeTable.medium
  let icon
  switch (medium.type) {
    case "TV_SHOW":
    case "CHANNEL":
      icon = null
      break
    case "VENUE":
    default:
      icon = <LocationIcon />
      break
  }
  return (
    <div
      className="medium-showtimes bg-bastille rounded-sm py-4 px-5 flex md:flex-row flex-col  md:space-x-3 space-x-0 md:space-y-0 space-y-2  md:items-start md:justify-start  w-full shadow-sm mx-auto"
      data-test="medium-timetable"
    >
      <div className="md:w-1/6 sm:w-full">
        <Link href={`/medium/${medium.slug}`}>
          <a
            className="flex justify-start md:text-base text-base"
            data-test="medium-link"
          >
            <div className="flex flex-col space-y-1">
              <div className="medium-name-link font-semibold text-lg flex justify-start items-center space-x-1">
                {icon ? <div className="w-5 h-5">{icon}</div> : <></>}
                <span>{medium.name}</span>
              </div>
              <MediumAttributes medium={medium} />
            </div>
          </a>
        </Link>
      </div>

      <MovieTimeTable shows={mediumTimeTable.shows} />
    </div>
  )
}

export default React.memo(MediumMovieTimeTable)
