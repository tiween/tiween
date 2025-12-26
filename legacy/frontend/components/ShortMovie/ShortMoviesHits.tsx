import { connectHits } from 'react-instantsearch-dom';
import ShortMovieCard from './ShortMovieCard';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Hits = ({ hits }) => (
  <div className="grid md:grid-cols-4 gap-4">
    {hits.map((hit) => (
      <ShortMovieCard hit={hit} key={hit.objectID} />
    ))}
  </div>
);

const ShortMoviesHits = connectHits(Hits);
export default ShortMoviesHits;
