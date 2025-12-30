import React from "react"

import { Genre } from "../../shared/models/genre"
import Term from "../../shared/models/term"

interface MovieTagsListProps {
  tags: Genre[] | Term[]
  limit?: number
}
const MovieTagsList: React.FC<MovieTagsListProps> = ({ tags, limit = 0 }) => {
  const tagsToDisplay = limit > 0 ? tags.slice(0, limit) : tags
  return (
    <div className="grid grid-flow-col auto-cols-max gap-2">
      {tagsToDisplay.map((tag) => (
        <div className="list-inline-item" key={tag.id}>
          <span className="bg-mulled-wine px-2 py-1 rounded text-xs capitalize">
            {tag.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export default MovieTagsList
