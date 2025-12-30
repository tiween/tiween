import React from "react"
import RatingStar from "@heroicons/react/solid/StarIcon"

interface IRatingProps {
  vote: number
  movieId: string | number
  credits: boolean
}

const Rating: React.FunctionComponent<IRatingProps> = ({
  vote,
  movieId,
  credits,
}) => {
  return (
    <div className="flex flex-col mb-5 md:items-start items-center">
      <div className="flex items-center space-x-1">
        <RatingStar className="text-gold w-6 h-6" />
        <span className="text-lg font-bold">
          {vote}
          <i className="font-normal">/10</i>
        </span>
      </div>

      {credits ? (
        <div className="text-xs">
          <a
            href={`https://www.themoviedb.org/movie/${movieId}`}
            target="_blank"
            rel="noreferrer"
          >
            note fourni par themoviedb.org
          </a>
        </div>
      ) : (
        <></>
      )}
    </div>
  )
}

export default Rating
