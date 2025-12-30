import React from "react"
import { GetServerSideProps } from "next"
import Head from "next/head"
/* eslint-disable no-unused-vars */
import get from "lodash/get"
import isEmpty from "lodash/isEmpty"
import { useSession } from "next-auth/react"

import MovieHeader from "../../../components/Movie/MovieHeader"
import MovieTimetable from "../../../components/Movie/MovieTimeTable"
import NoShowtimes from "../../../components/Movie/NoShowtimes"
import WatchProviders from "../../../components/Movie/WatchProviders"
import Layout from "../../../components/shared/Layout"
import { MovieProvider } from "../../../shared/context/movie.context"
import { UserReviewProvider } from "../../../shared/context/UserReviewContext"
import useRequest from "../../../shared/hooks/useRequest"
import { MovieMeta } from "../../../shared/models/moviemeta"
import Review from "../../../shared/models/review"
import { request } from "../../../shared/services/strapi"
import { movieShowtimesStructredData } from "../../../shared/services/structredData"
import { watchProviders } from "../../../shared/services/tmdb"

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params: { tmdbid },
  } = context

  const { data: moviemeta } = await request(`/moviemetas/tmdbid/${tmdbid}`)
  const { data: movieWatchProviders } = await watchProviders(tmdbid as string)
  const { data: timetable } = await request(
    `/showtimes/movie-timetable/${tmdbid}`
  )

  return {
    props: {
      moviemeta,
      timetable,
      movieWatchProviders,
    },
  }
}

type MovieShowtimesProps = {
  moviemeta: MovieMeta
  timetable: unknown
  movieWatchProviders: unknown
}
const MovieShowtimes: React.FC<MovieShowtimesProps> = ({
  moviemeta,
  timetable,
  movieWatchProviders,
}) => {
  const { remote: movie } = moviemeta
  const { backdrop_path, poster_path } = movie

  const frenchMovieProviders = get(movieWatchProviders, ["results", "FR"], {})

  const previewImage = backdrop_path
    ? `https://image.tmdb.org/t/p/original${backdrop_path}`
    : `https://image.tmdb.org/t/p/original${poster_path}`

  const { status } = useSession()
  const { id } = moviemeta
  const requestConfig =
    status === "authenticated"
      ? {
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/review/${id}`,
        }
      : null

  const { data: review } = useRequest<Review>(requestConfig)
  return (
    <MovieProvider moviemeta={moviemeta}>
      <UserReviewProvider review={review}>
        <Head>
          <script
            key="movie-structred-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: movieShowtimesStructredData(movie, timetable),
            }}
          />
          <title key="page-title">{`Cinémas et séances du film ${movie.title} en Tunisie`}</title>
          <meta
            name="description"
            content={`Retrouvez toutes les salles et les horaires de séance pour le film ${movie.title} en Tunisie`}
          />
          <meta
            key="og-title"
            name="og:title"
            content={`Cinémas, séances et horaires du film ${movie.title} en Tunisie`}
          />
          <meta key="og-image" name="og:image" content={previewImage} />
          <meta
            key="og-description"
            name="og:description"
            content={`Retrouvez toutes les salles et les horaires de séance pour le film ${movie.title} en Tunisie`}
          />
        </Head>
        <Layout>
          <MovieHeader />
          {!isEmpty(timetable) ? (
            <div
              className="md:pb-0  pb-10 container mx-auto max-w-6xl bg-cinder"
              id="movie-showtimes"
            >
              <MovieTimetable timetable={timetable} />
            </div>
          ) : (
            <div className="container px-5 md:max-w-6xl">
              <NoShowtimes
                message={`Il n'y a malheureusement pas de seances pour le film ${movie.title}`}
              >
                {!isEmpty(frenchMovieProviders) && (
                  <WatchProviders providers={frenchMovieProviders} />
                )}
              </NoShowtimes>
            </div>
          )}
        </Layout>
      </UserReviewProvider>
    </MovieProvider>
  )
}

export default React.memo(MovieShowtimes)
