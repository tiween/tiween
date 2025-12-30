import React from "react"
import { DateTime } from "luxon"

import { calendar } from "../../shared/services/utils"

const DateItem: React.FC<{
  item: string
  handleSelectDate: (string) => void
}> = ({ item, handleSelectDate }) => {
  const dt = DateTime.fromFormat(item, "yyyy-MM-dd")
  return (
    <button
      onClick={() => {
        handleSelectDate(item)
      }}
      className="text-xs text-white font-lato bg-transparent uppercase px-5 py-1 "
    >
      <div className="day ">{calendar(dt)}</div>
      <div className="text-base font-semibold">
        {dt.toFormat("dd", { locale: "fr" })}
      </div>
      <div className="month">{dt.toFormat("MMM", { locale: "fr" })}</div>
    </button>
  )
}

export default React.memo(DateItem)
