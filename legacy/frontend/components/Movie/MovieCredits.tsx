import React from "react"

import { getCast, getDirectors } from "../../modules/movieCredits"
import { CastPerson } from "../../shared/models/cast-person"
import { CrewPerson } from "../../shared/models/crew-person"

type MovieCreditsProps = {
  credits: {
    crew: CrewPerson[]
    cast: CastPerson[]
  }
  directorsOnly?: boolean
}

const MovieCredits: React.FC<MovieCreditsProps> = ({
  credits,
  directorsOnly = false,
}) => (
  <div className="text-xs font-medium">
    <span className="font-bold">de </span>
    <span className="italic">{`${getDirectors(credits).join(", ")}`}</span>
    {directorsOnly ? (
      <></>
    ) : (
      <>
        <br />
        <span className="font-bold"> avec </span>
        {`${getCast(credits).join(", ")}`}
      </>
    )}
  </div>
)

export default MovieCredits
