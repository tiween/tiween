import React from "react"
import ShareIcon from "@heroicons/react/solid/ShareIcon"
import ReactPlayer from "react-player"

import ShortMovie from "../../shared/models/short-movie"
import MovieTitle from "../Movie/MovieTitle"

interface IShortMovieMetaProps {
  movie: ShortMovie
}

const ShortMovieMeta: React.FunctionComponent<IShortMovieMetaProps> = ({
  movie,
}) => {
  const {
    title,
    originalTitle,
    synopsis,
    duration,
    languages,
    countries,
    fullVideo,
  } = movie
  return (
    <div className="short-movie-details text-white font-lato">
      {/* image goes here */}
      <div>
        {fullVideo ? (
          <ReactPlayer
            config={{
              vimeo: {
                playerOptions: {
                  responsive: true,
                },
              },
            }}
            width="945px"
            heigh="532px"
            url={fullVideo}
            light
          />
        ) : (
          <>trailers list goes here</>
        )}
      </div>
      <div className="flex justify-between">
        <h1 className="text-5xl font-bold">
          <MovieTitle title={title} originalTitle={originalTitle} />
        </h1>
        <div className="flex justify-between items-start">
          <ShareIcon />
        </div>
      </div>

      {/* categories goes here */}
      {/* team goes here here */}
      {/* full details goes here goes here here */}
      <div className="text-sm rounded border border-mulled-wine py-6 px-11 grid grid-cols-3 gap-10">
        {/* synopsis */}
        <div className="col-span-2">
          <p>{synopsis}</p>
        </div>
        <div className="flex flex-col">
          <div className="flex space-x-1">
            <span className="text-gray-500">Durée:</span>
            <span>{duration}</span>
          </div>
          <div className="flex space-x-1">
            <span className="text-gray-500">Pays:</span>
            <span className="capitalize">{countries.join()}</span>
          </div>
          <div className="flex space-x-1">
            <span className="text-gray-500">Langue:</span>
            <span className="capitalize">{languages.join()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShortMovieMeta
