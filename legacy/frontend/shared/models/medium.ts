import CreativeWork from './creative-work';
import { TMDBMovie } from './tmdb-movie';

export interface Medium {
  id: string;
  name: string;
  type: 'TV_SHOW' | 'VENUE' | 'CHANNEL';
  description?: string;
  slug?: string;
  //TODO fix typing
  works: Array<CreativeWork | TMDBMovie>;
}
