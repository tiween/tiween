/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { DateTime } from "luxon"

interface IMovieSearchResultItemProps {
  hit: any
}

const MovieSearchResultItem: React.FunctionComponent<
  IMovieSearchResultItemProps
> = ({ hit }) => (
  <div className="aa-Item rounded bg-gray-600 py-3 px-2 flex space-x-3">
    <div className="w-14 h-20 aspect-w-3 flex-none">
      <img
        src={`https://image.tmdb.org/t/p/w220_and_h330_bestv2${hit.poster_path}`}
        alt={hit.title}
        className="rounded-sm"
      />
      {/* <div className="broken-image"></div> */}
    </div>
    <div className="flex flex-col font-lato">
      <div className="font-lg">
        {hit.title}
        {hit.release_date ? (
          <span>{DateTime.fromISO(hit.release_date).toFormat("yyyy")}</span>
        ) : (
          <></>
        )}
      </div>
      {hit.title !== hit.original_title ? (
        <div className="italic font-light text-sm">{hit.original_title}</div>
      ) : (
        <></>
      )}
      {hit?.directors?.length > 0 ? (
        <div className="font-bold text-sm">de {hit.directors.join(", ")}</div>
      ) : (
        <></>
      )}
    </div>
  </div>
)

export default MovieSearchResultItem
