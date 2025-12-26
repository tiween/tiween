import Image, { ImageLoader } from 'next/image';
import { posterImageLoader, tmdbPosterImageLoader } from '../../../shared/services/cdn';

import Link from 'next/link';
import MovieTitle from '../MovieTitle';
import PlayIcon from '@heroicons/react/solid/PlayIcon';
import React from 'react';
import { TMDBMovie } from '../../../shared/models/tmdb-movie';
import get from 'lodash/get';
import { slugify } from '../../../shared/services/utils';
import { useRouter } from 'next/router';

export interface HomePageMovieCardProps {
  showPlayTrailersButton?: boolean;
  movie: TMDBMovie;
  index: number;
  onPlayButtonClick?: () => void;
}

const HomePageMovieCard: React.FC<HomePageMovieCardProps> = ({
  movie,
  showPlayTrailersButton = false,
  onPlayButtonClick,
}) => {
  const router = useRouter();
  //get overriden movie poster if not empty
  const moviePoster: { src?: string; loader?: ImageLoader } = {};

  const overridenPoster = get(movie, 'overridden_poster', null);
  if (overridenPoster) {
    moviePoster.src = overridenPoster.hash;
    moviePoster.loader = posterImageLoader;
  } else {
    moviePoster.src = `https://image.tmdb.org/t/p/original${movie?.poster_path}`;
    moviePoster.loader = tmdbPosterImageLoader;
  }

  return (
    <div
      className="group movie-card w-full relative m-auto cursor-pointer"
      data-test="movies-list-item-wrapper"
    >
      <div className="md:hidden block">
        <Link href={`/film/${slugify(movie?.title)}/${movie.id}`} passHref>
          <a data-test="movies-list-item">
            <Image
              className="w-full"
              loader={moviePoster.loader}
              src={moviePoster.src}
              width={370}
              height={556}
              layout="responsive"
              alt={movie.title}
            />
          </a>
        </Link>
      </div>
      <div className="desktop-movie-poster md:block hidden group-hover:opacity-25">
        <Image
          className="w-full "
          width={370}
          height={556}
          loader={moviePoster.loader}
          layout="responsive"
          src={moviePoster.src}
          alt={movie.title}
        />
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className="md:block hidden overlay absolute inset-0 opacity-0 group-hover:opacity-100 w-full h-full bg-transparent transition-opacity duration-300 ease-in-out;"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          router.push(`/film/${slugify(movie.title)}/${movie.id}`);
        }}
        role="button"
        tabIndex={0}
      >
        <h3 className="movie-title font-lato text-lg font-bold text-white text-center absolute inset-x-2 top-2 filter drop-shadow-sm">
          <MovieTitle title={movie.title} originalTitle={movie.original_title} />
        </h3>
        <>
          {showPlayTrailersButton && (
            <button
              className="cta-trailers absolute top-1/3 inset-x-1/3 text-white group-hover:opacity-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPlayButtonClick();
              }}
            >
              <PlayIcon className="text-5xl w-full stroke-current" />
            </button>
          )}
        </>

        <Link href={`/film/${slugify(movie.title)}/${movie.id}`} passHref>
          <a
            data-test="movies-list-item"
            className="cta-showtimes absolute py-3 no-underline font-bold text-white font-lato text-xs uppercase text-center rounded-sm  inset-x-5 bottom-4 bg-gradient-to-r from-wild-strawberry to-gold bg-no-repeat bg-left-bottom shadow-sm group-hover:opacity-100"
          >
            séances
          </a>
        </Link>
      </div>
    </div>
  );
};

export default React.memo(HomePageMovieCard);
