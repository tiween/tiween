import flatten from "lodash/flatten"
import get from "lodash/get"
import set from "lodash/set"
import slugify from "slugify"

import { getDirectors } from "../../modules/movieCredits"
import { MovieMeta } from "../models/moviemeta"
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-types */
import { Medium } from "./../models/medium"
import { TMDBMovie } from "./../models/tmdb-movie"

const extractMovieStructedData = (movie: TMDBMovie): Object => {
  const directors = getDirectors(movie.credits)
  const moviePosterRemotePath = `${process.env.NEXT_PUBLIC_CLOUDINARY_FETCH_URL}/https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.poster_path}`
  const movieStructredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    image: moviePosterRemotePath,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/film/${slugify(movie.title)}/${movie.id}`,
  }

  if (movie?.imdb_id) {
    set(movieStructredData, "sameAs", `https://imdb.com/title/${movie.imdb_id}`)
  }

  if (directors.length > 1) {
    set(
      movieStructredData,
      "directors",
      directors.map((d) => ({
        "@type": "Person",
        name: d,
      }))
    )
  } else if (directors.length > 0) {
    set(movieStructredData, "director", {
      "@type": "Person",
      name: directors[0],
    })
  }
  return movieStructredData
}

const extractMediumStructredData = (medium: Medium): unknown => {
  return {
    "@context": "https://schema.org",
    "@type": "MovieTheater",
    name: medium.name,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/medium/${medium.slug}`,
  }
}
const extractShowtimeData = (showtime, movie): Object => {
  const structredData = {
    "@context": "https://schema.org",
    "@type": "ScreeningEvent",
    startDate: showtime.date,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/film/${slugify(movie.title)}/${movie.id}#${
      showtime.id
    }`,
  }
  if (showtime.video_format == "_3d") {
    set(structredData, "videoFormat", "3D")
  }
  let language: string
  switch (showtime.language) {
    case "vf":
      language = "fr"
      break
    case "vostfr":
      language = get(movie, "original_language")
      break
    default:
      language = "en"
  }
  if (language) {
    set(structredData, "inLanguage", language)
  }
  return structredData
}

export const movieShowtimesStructredData = (
  movie: TMDBMovie,
  timetable: unknown
): string => {
  const movieStructredData = extractMovieStructedData(movie)
  const dates = Object.keys(timetable)
  const screeningEvents = dates.map((date) => {
    const screeningMediaIds = Object.keys(timetable[date])
    const showtimeListStructredData = screeningMediaIds.map((mediumId) => {
      const { medium, shows } = get(timetable, [date, mediumId])
      const mediumStructredData = extractMediumStructredData(medium)

      return shows.map((show) => {
        return {
          ...extractShowtimeData(show, movie),
          location: mediumStructredData,
        }
      })
    })
    return flatten(showtimeListStructredData)
  })
  const screeningEventsWithPosition = flatten(screeningEvents).map(
    (item, index) => {
      return {
        "@type": "ListItem",
        name: `Screening Event ${index + 1}`,
        position: index + 1,
        item: {
          ...item,
        },
      }
    }
  )

  const structredData = {
    ...movieStructredData,
    subjectOf: {
      "@type": "ItemList",
      itemListElement: screeningEventsWithPosition,
    },
  }
  return JSON.stringify(structredData)
}
