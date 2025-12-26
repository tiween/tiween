/* eslint-disable react/no-array-index-key */
import React from 'react';
import { TMDBMovie } from '../../shared/models/tmdb-movie';

type MovieInfoProps = {
  movie: TMDBMovie;
};
const MovieInfo: React.FC<MovieInfoProps> = ({ movie }) => (
  <div className="text-shadow-base">
    {movie.overview ? (
      <>
        <h4 className="font-bold drop-shadow-sm">Synopsis</h4>
        <p>{movie.overview}</p>
      </>
    ) : (
      <></>
    )}
  </div>
);

export default MovieInfo;
