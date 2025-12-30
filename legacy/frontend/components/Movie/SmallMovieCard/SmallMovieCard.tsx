import React from "react"
import Image from "next/image"
import Link from "next/link"
import classNames from "classnames"
import get from "lodash/get"

import countries from "../../../shared/constants/countries"
import { Medium } from "../../../shared/models/medium"
import { Show } from "../../../shared/models/show"
import { TMDBMovie } from "../../../shared/models/tmdb-movie"
import { tmdbPosterImageLoader } from "../../../shared/services/cdn"
import { slugify } from "../../../shared/services/utils"
import TimeTableList from "../../TimeTableList"
import MovieCredits from "../MovieCredits"
import MovieTagsList from "../MovieTagsList"
import MovieTitle from "../MovieTitle"

const SmallMovieCard: React.FC<{
  movie: TMDBMovie
  shows?: Show[]
  showTimeTable?: boolean
  medium?: Medium
  withMedium?: boolean
}> = ({
  movie,
  shows = [],
  showTimeTable = true,
  medium,
  withMedium = false,
}) => {
  return (
    <div className="flex md:flex-row flex-col space-y-2">
      <div
        className={classNames("md:max-w-lg w-full", {
          // 'md:w-1/3': showTimeTable,
        })}
      >
        <Link href={`/film/${slugify(movie?.title)}/${movie?.id}`} passHref>
          <a className="text-selago font-lato font-bold">
            <div className="flex space-x-3">
              {/* poster */}
              <div className="w-28 flex-none">
                <div className="aspect-w-2 aspect-h-3">
                  <Image
                    className="rounded-sm"
                    src={`https://image.tmdb.org/t/p/original${movie?.poster_path}`}
                    layout="fill"
                    loader={tmdbPosterImageLoader}
                    alt={movie?.title}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <span className="title text-base">
                  <MovieTitle
                    title={movie?.title}
                    originalTitle={movie?.original_title}
                  />
                </span>
                {movie?.credits && (
                  <span className="">
                    <MovieCredits credits={movie?.credits} directorsOnly />
                  </span>
                )}

                {movie?.genres?.length > 0 && (
                  <span className="">
                    <MovieTagsList tags={movie?.genres} limit={3} />
                  </span>
                )}

                <span className="text-xs font-medium">
                  {movie?.production_countries?.length > 0 &&
                    movie?.production_countries
                      .map((c) => get(countries, [c.iso_3166_1], c.name))
                      .join(", ")}
                </span>

                {medium && (
                  <div className="">
                    <div className="">{`${medium.name}`}</div>
                  </div>
                )}
              </div>
            </div>
          </a>
        </Link>
      </div>
      {showTimeTable && shows.length > 0 && (
        <div className="">
          <TimeTableList shows={shows} withMedium={withMedium} />
        </div>
      )}
    </div>
  )
}

export default SmallMovieCard
