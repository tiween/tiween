import * as React from "react"

import CreativeWork from "../../shared/models/creative-work"
import PlayHomePageCard from "./PlayHomePageCard"

interface IPlayHomePageListProps {
  items: Array<CreativeWork>
}

const PlayHomePageList: React.FunctionComponent<IPlayHomePageListProps> = ({
  items,
}) => {
  return (
    <div
      id="theatre"
      className="grid md:grid-cols-6 grid-cols-2 md:gap-3 gap-1 p-1 place-content-center"
    >
      {Object.keys(items).map((key) => (
        <div key={key}>
          <PlayHomePageCard play={items[key].creative_work} />
        </div>
      ))}
    </div>
  )
}

export default PlayHomePageList
