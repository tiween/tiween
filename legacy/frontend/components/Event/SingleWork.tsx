import * as React from "react"

import Event from "../../shared/models/event"
import WorkBlock from "./WorkBlock"

interface SingleWorkProps {
  event: Event
  rightBlock?: React.ReactNode
  children: React.ReactNode
}
const SingleWork: React.FunctionComponent<SingleWorkProps> = ({
  event,
  children,
  rightBlock,
}) => {
  const show = event?.showtimes[0]

  return (
    <div className="event-block-wrapper relative flex  flex-col-reverse md:flex-row justify-start items-start bg-bastille rounded-sm px-3 py-4">
      <div className="left-panel md:w-3/12 w-full mr-5  md:bg-transparent md:rounded-none bg-mulled-wine rounded-sm">
        {children}
      </div>
      <div className="event-showtimes flex-grow md:mb-0 mb-3">
        {<WorkBlock show={show} />}
      </div>
      <div>{rightBlock}</div>
    </div>
  )
}

export default SingleWork
