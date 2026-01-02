export interface FilmCardFilm {
  id: string | number
  title: string
  originalTitle?: string
  posterUrl: string
  slug: string
}

export interface FilmCardLabels {
  showtimes: string
  playTrailer: string
}
