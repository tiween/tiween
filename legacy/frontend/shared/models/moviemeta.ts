import Image from "./image"
import { TMDBMovie } from "./tmdb-movie"

export interface MovieMeta {
  id?: number
  remote?: TMDBMovie
  runtime: number
  content_type?: "MOVIE"
  homepage?: string
  overridden_poster?: Image
  tmdbid: string
}
