import React, { ReactNode } from "react"
import get from "lodash/get"

import { Show } from "../../shared/models/show"
import { getShowTimeBlockType } from "../../shared/services/utils"
import SmallMovieCard from "../Movie/SmallMovieCard"
import EventBlockShortMovieCard from "../ShortMovie/EventBlockShortMovieCard"

const WorkBlock: React.FunctionComponent<{ show: Show }> = ({ show }) => {
  const component = (): ReactNode => {
    const type = getShowTimeBlockType(show)
    let blockComponent: React.ReactElement
    switch (type) {
      default:
      case "MOVIE":
        blockComponent = (
          <SmallMovieCard
            key={show.id}
            movie={get(show, ["moviemeta", "remote"])}
          />
        )

        break
      case "SHORT_MOVIE":
        blockComponent = (
          <EventBlockShortMovieCard
            key={show.id}
            work={get(show, ["creative_work"])}
          />
        )
        break
    }
    return blockComponent
  }

  return <div className="w-full">{component()}</div>
}

export default WorkBlock
