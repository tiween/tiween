import * as React from 'react';

import { DateTime } from 'luxon';
import Image from 'next/image';
import MovieCredits from './MovieCredits';
import MovieInfo from './MovieInfo';
import MovieNavigationBar from './MovieNavigation/MovieNavigationBar';
import MovieTagsList from './MovieTagsList';
// import MovieTagsList from './MovieTagsList';
import MovieTitle from './MovieTitle';
import Rating from './Rating';
import { runtimeToHuman } from '../../shared/services/utils';
import { tmdbPosterImageLoader } from '../../shared/services/cdn';
import { useMovie } from '../../shared/context/movie.context';

const DesktopMovieHeader: React.FunctionComponent = () => {
  const moviemeta = useMovie();

  const { remote: movie } = moviemeta;
  return (
    <div className="movie-desktop-header pt-20">
      <div className="flex flex-col">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1
              className="text-6xl font-lato font-bold mb-5 drop-shadow-sm"
              data-test="desktop-movie-title"
            >
              <MovieTitle title={movie.title} originalTitle={movie.original_title} />
            </h1>

            <div className="flex flex-col mb-5 text-shadow-base">
              {movie?.vote_average ? (
                <Rating vote={movie.vote_average} movieId={movie.id} credits />
              ) : (
                <></>
              )}
              <div className="flex mb-2 text-sm font-lato space-x-3 text-shadow-base">
                {movie.runtime ? <div className=" ">{runtimeToHuman(movie.runtime)}</div> : <></>}
                {movie.release_date ? (
                  <div>
                    sortie le&nbsp;
                    <span className="capitalize">{`${DateTime.fromISO(movie.release_date).toFormat(
                      'dd MMMM yyyy',
                      { locale: 'fr' },
                    )}`}</span>
                  </div>
                ) : (
                  <></>
                )}
              </div>
              <div className="mb-5">
                <MovieTagsList tags={movie.genres} />
              </div>
              <div className="mb-5">
                <MovieCredits credits={movie.credits} />
              </div>
            </div>
          </div>
          <div className="w-40 h-56 relative">
            <Image
              className="rounded-sm"
              src={`https://image.tmdb.org/t/p/original/${movie.poster_path}`}
              alt={movie.title}
              layout="fill"
              loader={tmdbPosterImageLoader}
            />
          </div>
        </div>

        <MovieInfo movie={movie} />
        <MovieNavigationBar />
      </div>
    </div>
  );
};

export default DesktopMovieHeader;
