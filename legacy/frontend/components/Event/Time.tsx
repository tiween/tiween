import * as React from "react"
import { DateTime } from "luxon"

interface ITimeProps {
  date: string
}

const Time: React.FunctionComponent<ITimeProps> = ({ date }) => {
  return (
    <div className="font-fira font-semibold">
      {DateTime.fromISO(date, { zone: "Africa/Tunis" }).toFormat("HH'h'mm")}
    </div>
  )
}

export default Time
