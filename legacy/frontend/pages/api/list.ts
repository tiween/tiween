import { fetchMovie } from '../../shared/services/tmdb';
import { NextApiRequest, NextApiResponse } from 'next';
import pick from 'lodash/pick';

import { MovieMeta } from '../../shared/models/moviemeta';
const list = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const ids = [
    '496243',
    '515001',
    '546554',
    '492188',
    '503919',
    '621730',
    '633187',
    '436969',
    '385128',
  ];
  let allMovies = [];
  if (ids.length > 0) {
    const allResponses = await Promise.all(ids.map((tmdbid) => fetchMovie(tmdbid)));
    allMovies = allResponses.map((item: { data: MovieMeta }) =>
      pick(item.data, [
        'backdrop_path',
        'poster_path',
        'original_language',
        'original_title',
        'genres',
        'videos',
        'vote_average',
        'release_date',
        'release_dates',
        'runtime',
        'overview',
        'credits',
        'title',
        'id',
      ]),
    );
  }

  if (allMovies) {
    res.status(200).json(allMovies);
  }
};
export default list;
