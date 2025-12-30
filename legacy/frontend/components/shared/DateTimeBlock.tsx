import * as React from "react"
import { DateTime } from "luxon"

import Time from "../Event/Time"

interface IDateProps {
  date: string
}

const DateTimeBlock: React.FunctionComponent<IDateProps> = ({ date }) => {
  return (
    <div
      className="flex flex-col w-28 
     font-fira items-center font-semibold shadow-sm"
    >
      <div className="flex justify-between items-stretch day space-x-2">
        <div className=" uppercase ">
          {DateTime.fromISO(date, {
            zone: "Africa/Tunis",
          }).toFormat("cccc", { locale: "fr" })}
        </div>
        <div className="">
          {DateTime.fromISO(date, {
            zone: "Africa/Tunis",
          }).toFormat("dd", { locale: "fr" })}
        </div>
      </div>
      <div className="month uppercase">
        {DateTime.fromISO(date, {
          zone: "Africa/Tunis",
        }).toFormat("LLLL", { locale: "fr" })}
      </div>

      <Time date={date} />
    </div>
  )
}

export default DateTimeBlock
