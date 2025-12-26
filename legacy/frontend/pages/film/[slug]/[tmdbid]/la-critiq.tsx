/* eslint-disable no-unused-vars */
import { Editor, EditorState, convertFromRaw } from 'draft-js';
import { default as Review, default as ReviewModel } from '../../../../shared/models/review';

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '../../../../components/shared/Layout';
import MovieHeader from '../../../../components/Movie/MovieHeader';
import { MovieMeta } from '../../../../shared/models/moviemeta';
import { MovieProvider } from '../../../../shared/context/movie.context';
import React from 'react';
import ReviewAuthor from '../../../../components/Reviews/ReviewAuthor';
import { UserReviewProvider } from '../../../../shared/context/UserReviewContext';
import isEmpty from 'lodash/isEmpty';
// import { request } from '../../../../shared/services/strapi';
import useRequest from '../../../../shared/hooks/useRequest';
import { useSession } from 'next-auth/react';
import { watchProviders } from '../../../../shared/services/tmdb';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params: { tmdbid },
  } = context;

  // const { data: moviemeta } = await request(`/moviemetas/tmdbid/${tmdbid}`);
  // const { data: reviews } = await request(`/comments/moviemeta:${moviemeta.id}`);

  const { data: movieWatchProviders } = await watchProviders(tmdbid as string);

  return {
    props: {
      moviemeta: null,
      reviews: [],
      movieWatchProviders,
    },
  };
};

type MovieTeamReviewsProps = {
  moviemeta: MovieMeta;
  reviews: ReviewModel[];
  movieWatchProviders: unknown;
};
const MovieTeamReviews: React.FC<MovieTeamReviewsProps> = ({ moviemeta, reviews }) => {
  const { remote: movie } = moviemeta;
  const { backdrop_path, poster_path } = movie;

  const previewImage = backdrop_path
    ? `${process.env.NEXT_PUBLIC_CLOUDINARY_FETCH_URL}/https://image.tmdb.org/t/p/w1280${backdrop_path}`
    : `${process.env.NEXT_PUBLIC_CLOUDINARY_FETCH_URL}/https://image.tmdb.org/t/p/w780${poster_path}`;

  const { status } = useSession();
  const { id } = moviemeta;
  const requestConfig =
    status === 'authenticated'
      ? {
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/review/${id}`,
        }
      : null;

  const { data: review } = useRequest<Review>(requestConfig);
  return (
    <MovieProvider moviemeta={moviemeta}>
      <UserReviewProvider review={review}>
        <Head>
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

          {!isEmpty(reviews) ? (
            <div className="md:px-20">
              <div className="container max-w-6xl px-4 md:pb-0 pb-10 bg-cinder" id="movie-reviews">
                {reviews.map((review) => (
                  <div
                    className="one-review rounded-md bg-bastille overflow-hidden "
                    key={review.id}
                  >
                    <div className="bg-bastille-light px-1.5 py-2">
                      <ReviewAuthor author={review.authorUser} />
                    </div>
                    <div className="text-sm mt-2 px-3 py-4">
                      <Editor
                        readOnly
                        editorState={EditorState.createWithContent(
                          convertFromRaw(JSON.parse(review.content)),
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="container px-5 md:max-w-6xl"></div>
          )}
        </Layout>
      </UserReviewProvider>
    </MovieProvider>
  );
};

export default React.memo(MovieTeamReviews);
