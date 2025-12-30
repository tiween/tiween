import * as React from "react"
import Image from "next/image"
import get from "lodash/get"
import { DateTime } from "luxon"
import ReactPlayer from "react-player"

import { useMovie } from "../../shared/context/movie.context"
import { tmdbPosterImageLoader } from "../../shared/services/cdn"
import { runtimeToHuman } from "../../shared/services/utils"
import ReviewsCTA from "../Reviews/ReviewsCTA"
import MovieCredits from "./MovieCredits"
import MovieNavigationBar from "./MovieNavigation/MovieNavigationBar"
import MovieStickyBar from "./MovieStickyBar"
import MovieTitle from "./MovieTitle"

interface IMobileMovieHeaderProps {
  handleShowTrailers?: (show: boolean) => void
  withOverview?: boolean
}
const buildVideoUrl = (video): string => {
  let url
  switch (video.site) {
    case "YouTube":
      url = `https://www.youtube.com/watch?v=${video.key}`
      break
    default:
      break
  }

  return url
}

const MobileMovieHeader: React.FunctionComponent<IMobileMovieHeaderProps> = ({
  withOverview = true,
}) => {
  const { remote: movie } = useMovie()

  const videos = get(movie, ["videos", "results"], [])

  let backgroundImageStyles = {}
  if (movie?.backdrop_path) {
    backgroundImageStyles = {
      backgroundImage: `linear-gradient(45deg, rgba(12,9,17,1) 25%, #48484966 75%, rgba(255,255,255,0) 95%),url(${process.env.NEXT_PUBLIC_CDN_BASE_URL}/t/p/original${movie?.backdrop_path}`,
    }
  }
  const mobilePosterStyles = {
    width: "calc(((100vw / 2.222222) - 40px) / 1.5)",
    minWidth: "calc(((100vw / 2.222222) - 40px) / 1.5)",
    height: "calc((100vw / 2.222222) - 40px)",
    minHeight: "calc((100vw / 2.222222) - 40px)",
  }

  return (
    <div className="movie-mobile-header flex flex-col justify-start text-selago ">
      {/* Movie Poster and Background */}
      <div
        className="py-6 pl-5 bg-no-repeat bg-right-top bg-contain border-b border-mulled-wine flex"
        style={backgroundImageStyles}
      >
        <div className="block movie-poster-wrapper " style={mobilePosterStyles}>
          <Image
            className="rounded-sm"
            src={`https://image.tmdb.org/t/p/w220_and_h330_bestv2/${movie.poster_path}`}
            alt={movie.title}
            width="220"
            height="330"
            loader={tmdbPosterImageLoader}
          />
        </div>
        <div className="movie-meta flex flex-col pl-2 text-shadow-base">
          <h1 className="text-xl flex items-baseline font-lato font-bold drop-shadow-sm">
            <MovieTitle
              title={movie.title}
              originalTitle={movie.original_title}
            />
          </h1>
          <div className="flex mb-1 text-xs font-lato ">
            {movie.release_date ? (
              <div className="">
                {`${DateTime.fromISO(movie.release_date).toFormat(
                  "dd MMMM yyyy",
                  {
                    locale: "fr",
                  }
                )}`}
                &nbsp;/&nbsp;
              </div>
            ) : (
              <></>
            )}
            {movie.runtime ? (
              <div className="">{runtimeToHuman(movie.runtime)}</div>
            ) : (
              <></>
            )}
          </div>
          <div>
            <MovieCredits credits={movie.credits} />
          </div>
        </div>
      </div>

      <MovieStickyBar />

      {/* Movie Title and Release Year*/}
      <div className="flex flex-col">
        <div className="flex space-x-2 mb-1 px-3">
          {/* Rating */}
          <div className="flex flex-col items-center">
            {/* {movie?.vote_average ? (
              <MobileRating vote={movie.vote_average} movieId={movie.id} />
            ) : (
              <></>
            )} */}
          </div>
        </div>
        {videos && videos.length > 0 && (
          <ReactPlayer
            className="main-movie-trailer aspect-w-16 aspect-h-9"
            width="100%"
            height="100%"
            url={buildVideoUrl(videos[0])}
          />
        )}
        <ReviewsCTA />

        <MovieNavigationBar />
        {movie?.overview && withOverview ? (
          <div className="font-lato text-sm mb-2 px-2">
            <h2 className="text-base font-semibold">Synopsis</h2>
            {movie.overview}
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}

export default MobileMovieHeader
