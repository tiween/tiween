import React, { Fragment } from "react"
import get from "lodash/get"

import { HomePageAction } from "../../pages/index"
import CreativeWork from "../../shared/models/creative-work"
// import { MovieMeta } from '../../shared/models/moviemeta';
import { TMDBMovie } from "../../shared/models/tmdb-movie"
import HomePageShortMovieCard from "../ShortMovie/HomePageShortMovieCard"
import HomePageMovieCard from "./HomePageMovieCard/HomePageMovieCard"

const MoviesList: React.FC<{
  items: Array<CreativeWork | TMDBMovie>
  handleShowTrailer: (action: HomePageAction) => void
}> = ({ items, handleShowTrailer }) => {
  return items.length > 0 ? (
    <div className="grid md:grid-cols-6 grid-cols-2" data-test="movies-list">
      {items.map((item, index) => {
        return (
          <Fragment key={item.id}>
            {item.content_type === "MOVIE" ? (
              <HomePageMovieCard
                index={index + 1}
                movie={item}
                showPlayTrailersButton={
                  get(item, "videos.results", []).length > 0
                }
                onPlayButtonClick={() => {
                  handleShowTrailer({
                    type: "open",
                    payload: {
                      trailers: item?.videos?.results,
                      movieTitle: item.title,
                    },
                  })
                }}
              />
            ) : (
              <HomePageShortMovieCard
                index={index + 1}
                work={item as CreativeWork}
                showPlayTrailersButton={
                  get(item, "videos.results", []).length > 0
                }
              />
            )}
          </Fragment>
        )
      })}
    </div>
  ) : (
    <>no movies</>
  )
}

export default React.memo(MoviesList)
