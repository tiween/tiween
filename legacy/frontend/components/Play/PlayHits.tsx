import { connectHits } from "react-instantsearch-dom"

import PlayCard from "./PlayCard"

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Hits = ({ hits }) => (
  <div className="grid md:grid-cols-4 gap-4">
    {hits.map((hit) => (
      <PlayCard hit={hit} key={hit.objectID} />
    ))}
  </div>
)

const PlayHits = connectHits(Hits)
export default PlayHits
