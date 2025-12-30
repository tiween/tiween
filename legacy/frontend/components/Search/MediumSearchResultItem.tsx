/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"

interface IMediumSearchResultItemProps {
  hit: any
}

const MediumSearchResultItem: React.FunctionComponent<
  IMediumSearchResultItemProps
> = ({ hit }) => {
  return (
    <div
      key={hit.objectID}
      className="aa-Item rounded bg-gray-500 py-1 px-2 flex space-x-3"
    >
      <div className="flex flex-col">
        <div>{hit.name}</div>
      </div>
    </div>
  )
}

export default MediumSearchResultItem
