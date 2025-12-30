import * as React from "react"

import RefinementSelectList from "../Search/RefinementSelectList"

const ShortMovieFilters: React.FunctionComponent = () => {
  return (
    <div className="flex justify-start space-x-6">
      <RefinementSelectList attribute="terms.name" label="Genres" />
      <RefinementSelectList attribute="countries.name" label="Pays" />
    </div>
  )
}

export default ShortMovieFilters
