import CreativeWork from '../shared/models/creative-work';
import EventGroup from '../shared/models/event-group';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import HomePageHero from '../components/shared/HomePageHero';
import Layout from '../components/shared/Layout';
import { MovieMeta } from '../shared/models/moviemeta';
import MoviesList from '../components/Movie/MoviesList';
import PlayHomePageList from '../components/Play/PlayHomePageList';
import Section from '../components/shared/Section';
import { TMDBMovie } from '../shared/models/tmdb-movie';
import { Video } from '../shared/models/video';
import dynamic from 'next/dynamic';
import get from 'lodash/get';
import pick from 'lodash/pick';
import { request } from '../shared/services/strapi';
import { useReducer } from 'react';

const TrailersModal = dynamic(() => import('../components/TrailersModal'));

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
  let movies = [];
  try {
    //FETCH NOWPLAYING MOVIES
    const nowPlayingMoviesResults = await request<Array<MovieMeta | CreativeWork>>(
      '/showtimes/movies/upcoming',
    );
    const { data: items } = nowPlayingMoviesResults;
    movies = items.map((item) => {
      if (item.content_type === 'MOVIE') {
        return pick(item, [
          'content_type',
          'overridden_poster',
          'poster_path',
          'original_language',
          'original_title',
          'release_date',
          'videos',
          'title',
          'id',
        ]);
      } else {
        return item;
      }
    });
  } catch (error) {
    console.log('ERROR', error);
  }

  return {
    props: {
      movies,
      plays: null,
      eventGroups: null,
    },
  };
};

export type HomePageState = {
  showTrailer?: boolean;
  trailers?: Video[] | [];
  movieTitle?: string;
};
export type HomePageAction =
  | { type: 'open'; payload: { trailers: Video[] | []; movieTitle: string } }
  | { type: 'close' };

const reducer = (state: HomePageState, action: HomePageAction): HomePageState => {
  switch (action.type) {
    case 'open':
      return { showTrailer: true, ...action.payload };
    case 'close':
      return { showTrailer: false };
    default:
      throw new Error();
  }
};

interface IHomePageProps {
  movies: Array<TMDBMovie | CreativeWork>;
  plays: Array<CreativeWork>;
  eventGroups: EventGroup[];
}

const Home: React.FC<IHomePageProps> = ({ movies, plays, eventGroups }) => {
  const [{ showTrailer, trailers, movieTitle }, dispatch] = useReducer(reducer, {
    showTrailer: false,
    trailers: [],
  });

  const handlShowTrailer = (action: HomePageAction): void => {
    dispatch(action);
  };

  const mainEventGroup = eventGroups && eventGroups.length > 0 ? eventGroups[0] : null;

  return (
    <>
      <Layout>
        <Head>
          <title>Tiween: Cinéma, salles et horaires de séances en Tunisie</title>
          <meta
            key="description"
            name="description"
            content={`Retrouvez toutes les salles et les horaires de séances de cinéma en Tunisie`}
          />
          <meta
            key="og-title"
            name="og:title"
            content={`Salles de Cinémas, séances et horaires de films en Tunisie`}
          />
          <meta
            key="og-image"
            name="og:image"
            content={`${process.env.NEXT_PUBLIC_BASE_URL}/open-graph-facebook.png`}
          />
          <meta
            key="og-description"
            name="og:description"
            content={`Retrouvez toutes les salles et les horaires de séances de cinéma en Tunisie`}
          />
        </Head>
        <div className="container md:max-w-6xl">
          <div className="md:block hidden text-center container text-xl">
            <h1>
              Découvrez les films en salles sur toute la Tunisie, les séances, bandes-annonces et
              informations pratiques.
            </h1>
          </div>

          {eventGroups && eventGroups.length > 0 ? (
            <div className="md:px-0">
              <HomePageHero
                title={get(
                  mainEventGroup,
                  ['homepage_display', 'title'],
                  get(mainEventGroup, ['attributes', 'title'], ''),
                )}
                subtitle={get(
                  mainEventGroup,
                  ['homepage_display', 'subtitle'],
                  get(mainEventGroup, ['attributes', 'subtitle'], ''),
                )}
                image={get(mainEventGroup, ['homepage_display', 'image'])}
                ctas={[
                  {
                    url: `/event-group/${get(mainEventGroup, ['attributes', 'slug'])}`,
                    title: 'voir les détails',
                  },
                ]}
              />
            </div>
          ) : (
            <></>
          )}
          <Section title="En salles" className="home-page-movies-list">
            <MoviesList items={movies} handleShowTrailer={handlShowTrailer} />
          </Section>

          {plays?.length > 0 ? (
            <Section title="Théâtre" className="home-page-plays-list">
              <PlayHomePageList items={plays} />
            </Section>
          ) : (
            <></>
          )}
        </div>
      </Layout>
      {showTrailer && trailers.length > 0 ? (
        <TrailersModal
          videos={trailers}
          show={showTrailer}
          title={`${movieTitle}`}
          handleClose={() => {
            dispatch({ type: 'close' });
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
};

Home.propTypes = {};
export default Home;
