import React from "react"
import isEmpty from "lodash/isEmpty"
import { DateTime } from "luxon"

import { Show } from "../../shared/models/show"
import PremiereTooltip from "./PremiereTooltip"

export type TimetableItemProps = {
  withMedium?: boolean
  show: Show
  canAddToCalendar?: boolean
  runtime?: number
}

const TimetableItem: React.FC<TimetableItemProps> = ({
  show,
  withMedium = false,
  runtime = 0,
}) => {
  return (
    <div
      className="flex flex-col justify-around time group relative bg-mulled-wine rounded px-9 py-3"
      id={`${show.id}`}
    >
      <div className="flex flex-col w-full  text-base font-medium  justify-around items-center text-white font-fira">
        <div className="time text-2xl flex flex-col leading-5">
          <span>
            {DateTime.fromISO(show.event.fullStartDate, {
              zone: "Africa/Tunis",
            }).toFormat("HH'h'mm")}
          </span>

          {runtime > 0 && (
            <span className="font-thin  text-xs mt text-center">
              (fin:&nbsp;
              {DateTime.fromISO(show.event.fullStartDate, {
                zone: "Africa/Tunis",
              })
                .plus({ minutes: runtime })
                .toFormat("HH'h'mm")}
              )
            </span>
          )}
        </div>
      </div>
      <div className="font-lato flex justify-around items-center text-center text-xs">
        <span className="language uppercase font-normal">{show.language}</span>
        {show.video_format === "_3d" && (
          <span className="ml-1 video-format text-gold font-black ">3D</span>
        )}
      </div>
      {!isEmpty(show.event.medium) && withMedium && (
        <div className="font-normal  text-sm mt-1">{`${show.event.medium.name}`}</div>
      )}

      {show.premiere && <PremiereTooltip />}
    </div>
  )
}

export default TimetableItem
