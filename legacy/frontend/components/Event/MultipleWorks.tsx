import * as React from "react"
import { Tab } from "@headlessui/react"
import classNames from "classnames"
import get from "lodash/get"
import truncate from "lodash/truncate"
import { ReactElement } from "react-markdown/lib/react-markdown"

import Event from "../../shared/models/event"
import { Show } from "../../shared/models/show"
import { getShowTimeBlockType } from "../../shared/services/utils"
import WorkBlock from "./WorkBlock"

const getWorkTitle = (show: Show, selected: boolean): ReactElement => {
  const type = getShowTimeBlockType(show)

  switch (type) {
    case "MOVIE":
      return (
        <div>
          {selected
            ? get(show, ["moviemeta", "remote", "title"])
            : truncate(get(show, ["moviemeta", "remote", "title"]), {
                length: 10,
              })}{" "}
        </div>
      )

    case "SHORT_MOVIE":
      return (
        <div>
          {selected
            ? get(show, ["creative_work", "title"])
            : truncate(get(show, ["creative_work", "title"]), { length: 10 })}
          <span className="text-2xs font-mono ml-2">[court-métrage]</span>
        </div>
      )
  }
}
interface MultipleWorksProps {
  event: Event
  rightBlock?: React.ReactNode
  children: React.ReactNode
}
const MultipleWorks: React.FunctionComponent<MultipleWorksProps> = ({
  event,
  children,
  rightBlock,
}) => {
  return (
    <div className="event-with-multiple-works">
      <Tab.Group as="div" className="tab-group">
        <Tab.List as="div" className="flex justify-start p-0 overflow-x-auto">
          {event.showtimes.length > 0 &&
            event.showtimes.map((show) => {
              return (
                <Tab
                  as="div"
                  key={show.id}
                  className={({ selected }) =>
                    classNames(
                      "md:text-lg text-sm text-white rounded-t-sm bg-bastille px-4 py-2 cursor-pointer",
                      {
                        "opacity-40 text-gray-300": !selected,
                        "border-wild-strawberry-dark border-t-2": selected,
                      }
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="">{getWorkTitle(show, selected)}</div>
                  )}
                </Tab>
              )
            })}
        </Tab.List>
        <div className="flex relative flex-col-reverse md:flex-row  justify-start bg-bastille rounded-b-sm px-3 py-4">
          <div className="left-panel md:w-3/12 w-full mr-5 md:bg-transparent md:rounded-none bg-mulled-wine rounded-sm ">
            {children}
          </div>
          <div className="event-showtimes md:flex-grow md:mb-0 mb-3">
            <Tab.Panels>
              {event.showtimes.map((show) => {
                return (
                  <Tab.Panel key={show.id} as="div" className="flex-grow">
                    <WorkBlock show={show} />
                  </Tab.Panel>
                )
              })}
            </Tab.Panels>
          </div>
          <div className="right-panel flex-grow-0">{rightBlock}</div>
        </div>
      </Tab.Group>
    </div>
  )
}

export default MultipleWorks
