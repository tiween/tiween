import React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import PlayIcon from "@heroicons/react/solid/PlayIcon"
import isEmpty from "lodash/isEmpty"

import CreativeWork from "../../shared/models/creative-work"
import MovieTitle from "../Movie/MovieTitle"
import MoviePoster from "../shared/MoviePoster"

export interface ShortMovieHomePageCardProps {
  showPlayTrailersButton?: boolean
  work: CreativeWork
  index: number
  onPlayButtonClick?: () => void
}

const ShortMovieHomePageCard: React.FC<ShortMovieHomePageCardProps> = ({
  work,
  showPlayTrailersButton = false,
  onPlayButtonClick,
}) => {
  const router = useRouter()
  const { poster, photos } = work
  let image
  if (!isEmpty(poster)) {
    image = poster
  } else if (!isEmpty(photos) && photos.length > 0) {
    image = photos[0]
  }
  return (
    <div className="group work-card w-full relative m-auto cursor-pointer">
      <div className="md:hidden block">
        <Link href={`/court-metrage/${work.slug}`} passHref>
          <a href="">
            <MoviePoster posterPath={image?.hash} alt={work.title} />
          </a>
        </Link>
      </div>
      <div className="desktop-work-poster md:block hidden group-hover:opacity-25">
        <MoviePoster posterPath={image?.hash} alt={work.title} />
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className="md:block hidden overlay absolute inset-0 opacity-0 group-hover:opacity-100 w-full h-full bg-transparent transition-opacity duration-300 ease-in-out;"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          router.push(`/court-metrage/${work.slug}`)
        }}
        role="button"
        tabIndex={0}
      >
        <h3 className="work-title font-lato text-lg font-bold text-white text-center absolute inset-x-2 top-2 filter drop-shadow-sm">
          <MovieTitle title={work.title} originalTitle={work.originalTitle} />
        </h3>
        <>
          {showPlayTrailersButton && (
            <button
              className="cta-trailers absolute top-1/3 inset-x-1/3 text-white group-hover:opacity-100"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onPlayButtonClick()
              }}
            >
              <PlayIcon className="text-5xl w-full stroke-current" />
            </button>
          )}
        </>

        <Link href={`/court-metrage/${work.slug}`} passHref>
          <a className="cta-showtimes absolute py-3 no-underline font-bold text-white font-lato text-xs uppercase text-center rounded-sm  inset-x-5 bottom-4 bg-gradient-to-r from-wild-strawberry to-gold bg-no-repeat bg-left-bottom shadow-sm group-hover:opacity-100">
            séances
          </a>
        </Link>
      </div>
    </div>
  )
}

export default React.memo(ShortMovieHomePageCard)
