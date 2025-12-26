import { AppendedCredits } from './appendend-credits';
import { AppendedVideos } from './appended-videos';
import { Collection } from './collection';
import { Company } from './company';
import { Country } from './country';
import { Genre } from './genre';
import { Language } from './language';
export interface TMDBMovie {
  id?: string | number;

  content_type: 'MOVIE';
  title: string;
  original_title: string;
  poster_path: string;
  adult?: boolean;
  overview?: string;
  release_date?: string;
  genre_ids?: number[];
  original_language?: string;
  backdrop_path?: string;
  popularity?: number;
  vote_count?: number;
  video?: boolean;
  vote_average?: number;
  belongs_to_collection?: Collection;
  budget?: number;
  genres?: Genre[];
  imdb_id?: string;
  production_companies?: Company[];
  production_countries?: Country[];
  revenue?: number;
  runtime?: number;
  spoken_languages?: Language[];
  status?: string;
  tagline?: string;
  videos?: AppendedVideos;
  credits?: AppendedCredits;
}
