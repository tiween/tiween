import React from "react"
import classNames from "classnames"
import { DateTime } from "luxon"

import DateItem from "./DateItem"

const DatesList: React.FC<{
  dates: string[]
  selected: string
  handleSelectDate: (string) => void
}> = ({ dates, selected, handleSelectDate }) => {
  return (
    <div
      data-test="dates-list"
      className={classNames(
        "dates-selector  border-b border-manatee z-20  overflow-x-auto scroll-snap-x",
        {}
      )}
    >
      <ul className="flex w-full bg-cinder">
        {dates.map((item) => {
          const dt = DateTime.fromFormat(item, "yyyy-MM-dd")
          const key = dt.toMillis()
          return (
            <li
              key={key}
              className={classNames(
                "bg-mulled-wine",
                "hover:bg-mulled-wine",
                "border-r border-manatee",
                {
                  "bg-gradient-to-br from-amaranth via-wild-strawberry to-gold bg-no-repeat bg-left-bottom":
                    selected === item,
                }
              )}
            >
              <DateItem item={item} handleSelectDate={handleSelectDate} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default React.memo(DatesList)
