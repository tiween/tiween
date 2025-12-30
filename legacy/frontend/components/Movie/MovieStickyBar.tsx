import React, { useState } from "react"
import Image from "next/image"
import { useScrollPosition } from "@n8tb1t/use-scroll-position"
import classNames from "classnames"
import { DateTime } from "luxon"

import { useMovie } from "../../shared/context/movie.context"
import { tmdbPosterImageLoader } from "../../shared/services/cdn"
import { runtimeToHuman } from "../../shared/services/utils"
import MobileRating from "./MobileRating"
import MovieTitle from "./MovieTitle"

const MovieStickyBar: React.FunctionComponent = () => {
  const { remote: movie } = useMovie()
  const stickyMobilePosterStyles = {
    width: "calc(((100vw / 2.222222) - 40px) / 2.3)",
    minWidth: "calc(((100vw / 2.222222) - 40px) / 2.3)",
  }

  const [visible, setVisible] = useState(false)
  useScrollPosition(
    ({ currPos }) => {
      if (Math.abs(currPos.y) > 300) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    },
    [visible]
  )
  const wrapperClasses = [
    "h-auto",
    "w-full",
    "bg-cinder",
    "border-b",
    "border-mulled-wine",
    "px-4",
    "pt-3",
    "flex",
    "space-x-3",
    "fixed",
    "top-0",
    "left-0",
    "z-10",
  ]
  const visibility = visible ? "block" : "hidden"
  return (
    <div className={classNames(wrapperClasses, visibility)}>
      <div
        className="stick-movie-poster-wrapper"
        style={stickyMobilePosterStyles}
      >
        <Image
          className="rounded-sm "
          src={`https://image.tmdb.org/t/p/w220_and_h330_bestv2/${movie.poster_path}`}
          alt={movie.title}
          width="220"
          height="330"
          loader={tmdbPosterImageLoader}
        />
      </div>
      <div className="flex flex-col justify-center">
        <h2 className="text-base flex font-lato font-bold  mb-2">
          <MovieTitle
            title={movie.title}
            originalTitle={movie.original_title}
          />
          {movie.release_date ? (
            <div className="ml-1 font-normal font-lato text-base">{`(${DateTime.fromISO(
              movie.release_date
            ).toFormat("yyyy")})`}</div>
          ) : (
            <></>
          )}
        </h2>
        <div className="flex flex-col text-xs">
          {movie?.vote_average ? (
            <MobileRating vote={movie.vote_average} movieId={movie.id} />
          ) : (
            <></>
          )}

          <div className="flex mb-2 text-xs font-lato space-x-3">
            {movie.release_date ? (
              <div className="  ">{`Sortie: ${DateTime.fromISO(
                movie.release_date
              ).toFormat("dd MMMM yyyy", { locale: "fr" })}`}</div>
            ) : (
              <></>
            )}
            {movie.runtime ? (
              <div className="">{runtimeToHuman(movie.runtime)}</div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovieStickyBar
