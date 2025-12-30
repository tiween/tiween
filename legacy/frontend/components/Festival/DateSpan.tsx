import React from "react"
import { DateTime } from "luxon"

const DateSpan: React.FC<{ start: string; end: string }> = ({ start, end }) => {
  const dtStart = DateTime.fromISO(start)
  const dtEnd = DateTime.fromISO(end)

  let startLabel: string
  let endLabel: string

  if (dtStart.hasSame(dtEnd, "month")) {
    startLabel = dtStart.toFormat("dd")
    endLabel = `${dtEnd.toFormat("dd")} ${dtStart.toFormat("MMMM yyyy", { locale: "fr" })}`
  } else {
    startLabel = dtStart.toFormat("DDDD", { locale: "fr" })
    endLabel = dtEnd.toFormat("DDDD", {
      locale: "fr",
    })
  }
  return (
    <div className="font-fira">
      du&nbsp;<span className="font-semibold">{startLabel}</span>&nbsp;au&nbsp;
      <span className="font-semibold">{endLabel}</span>
    </div>
  )
}

export default DateSpan
