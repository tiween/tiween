import * as React from 'react';

import AlgoliaHit from '../../shared/models/AlgoliaHit';
import CreativeWork from '../../shared/models/creative-work';
import ShortMovieCard from './ShortMovieCard';

interface IShortMovieListProps {
  movies: Array<CreativeWork & AlgoliaHit>;
}

const ShortMovieList: React.FunctionComponent<IShortMovieListProps> = ({ movies }) => {
  return (
    <div className="grid grid-cols-3 short-movie-list gap-5">
      {movies?.map((movie) => (
        <ShortMovieCard key={movie.objectID} hit={movie} />
      ))}
    </div>
  );
};

export default ShortMovieList;
