import { GetStaticPaths, GetStaticProps } from 'next';
import {
  ar1619ImageLoader,
  getVideoPreviewImage,
  posterImageLoader,
} from '../../shared/services/cdn';
import { getCreativeWorkPersonsByJob, runtimeToHuman } from '../../shared/services/utils';

import AwardIcon from '../../components/shared/AwardIcon';
import CreativeWork from '../../shared/models/creative-work';
import DateTimeBlock from '../../components/shared/DateTimeBlock';
import Event from '../../shared/models/event';
import Image from 'next/image';
import Layout from '../../components/shared/Layout';
import MediumAttributes from '../../components/MediumAttributes';
import MediumName from '../../components/Medium/MediumName';
import MovieTagsList from '../../components/Movie/MovieTagsList';
import MovieTitle from '../../components/Movie/MovieTitle';
import React from 'react';
import ReactPlayer from 'react-player';
import Section from '../../components/shared/Section';
import ShortMoviesSuggestionList from '../../components/ShortMovie/ShortMoviesSuggestionList';
import StrapiApiResponse from '../../shared/models/strapi-api-response';
// import ShareIcon from '@heroicons/react/outline/ShareIcon';
import classNames from 'classnames';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { request } from '../../shared/services/strapi';
import useRequest from '../../shared/hooks/useRequest';

export const getStaticPaths: GetStaticPaths = async () => {
  // Call an external API endpoint to get posts
  const {
    data: { data: results },
  } = await request<StrapiApiResponse<CreativeWork>>(
    '/creative-works?_limit=-1&filters[type][$eq]=SHORT_MOVIE',
  );

  const paths = results.map(({ attributes: item }) => ({
    params: { slug: item.slug },
  }));
  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false };
};
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const {
    data: { data: results },
  } = await request<StrapiApiResponse<CreativeWork>>(
    `/creative-works?filters[slug][$eq]=${params.slug}&populate[0]=videos&populate[1]=crew.fullName&populate[2]=photos&populate[3]=production_countries`,
  );

  return { props: { work: { ...results[0].attributes, id: results[0].id } } };
};

const ShortMoviesHomePage: React.FunctionComponent<{ work: CreativeWork }> = ({ work }) => {
  console.log('---->', work);

  const {
    id,

    title,
    originalTitle,
    videos = [],
    awards,
    terms,
    cast,
    production_companies,
    poster,
    photos,
  } = work;

  const fullVideo = get(
    videos.filter((v) => v.type === 'FULL_LENGTH'),
    [0],
  );
  const trailerVideo = get(
    videos.filter((v) => v.type === 'TEASER'),
    [0],
  );
  const videoToDisplay = !isEmpty(fullVideo) ? fullVideo : trailerVideo;

  const directors = getCreativeWorkPersonsByJob(work, 'Réalisateur');

  const { data: events } = useRequest<Event[]>({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${id}`,
  });
  return (
    <Layout>
      <div className="container flex md:flex-row flex:cols pb-16 max-w-6xl">
        <div className="main-panel md:w-8/12 w-full md:mr-6">
          {!isEmpty(videoToDisplay) && (
            <div className="aspect-w-16 aspect-h-9 mb-3">
              <ReactPlayer
                config={{
                  vimeo: {
                    playerOptions: {
                      responsive: true,
                    },
                  },
                }}
                width="100%"
                height="100%"
                url={videoToDisplay.url}
                light={photos.length > 0 ? getVideoPreviewImage(get(photos, [0, 'hash'])) : false}
              />
            </div>
          )}
          {isEmpty(videoToDisplay) && photos.length > 0 && (
            <div className="aspect-w-16 aspect-h-9 mb-3">
              <Image
                className="rounded-sm"
                src={photos[0].hash}
                layout="fill"
                alt={title}
                loader={ar1619ImageLoader}
              />
            </div>
          )}

          <div className="px-2">
            {/* event announcement  */}
            <div className="flex justify-between items-start ">
              <div className="flex md:py-2 md:my-1 md:space-x-3 mb-2 w-9/12">
                {!isEmpty(poster) && (
                  <div className="md:w-1/12 md:block hidden flex-none">
                    <div className="aspect-w-2 aspect-h-3">
                      <Image
                        className="rounded-sm"
                        src={poster.hash}
                        layout="fill"
                        alt={title}
                        loader={posterImageLoader}
                      />
                    </div>
                  </div>
                )}
                <div className="md:text-3xl text-xl font-lato font-black">
                  <MovieTitle title={title} originalTitle={originalTitle} />
                </div>
              </div>
            </div>
            <div className="md:hidden flex   justify-between items-center text-sm">
              <div className="flex flex-col space-y-1">
                <div className="flex gap-3 items-center">
                  <div className="">{runtimeToHuman(work.runtime)}</div>
                  <div> {work?.production_countries?.map((c) => c?.name).join(',')}</div>
                </div>
                {terms?.length > 0 && (
                  <div>
                    <MovieTagsList tags={terms} />
                  </div>
                )}
              </div>
              <div>
                {production_companies?.length > 0 && (
                  <div>{production_companies?.map((item) => item?.name).join(', ')}</div>
                )}
              </div>
            </div>
            <div className="md:border-b border-t border-mulled-wine py-4 my-2 px-2 flex md:flex:row flex-cols justify-between md:text-sm text-base md:font-semibold ">
              <div className="md:pr-4 md:mr-7 md:w-3/4 w-full flex flex-col space-y-2 md:border-r border-mulled-wine ">
                {directors?.length > 0 && (
                  <div>
                    <span className="font-normal">de: &nbsp; </span>
                    {directors?.map((item) => item?.person?.fullName).join(', ')}
                  </div>
                )}

                {cast?.length > 0 && (
                  <div>
                    <span className="font-normal">avec: &nbsp; </span>
                    {cast?.map((item) => item?.person?.fullName).join(', ')}
                  </div>
                )}
              </div>
              <div className="md:flex hidden w-1/4  flex-col space-y-2">
                <div className="flex gap-3">
                  <div className="">{runtimeToHuman(work.runtime)}</div>

                  {work?.production_countries?.length > 0 && (
                    <div> {work?.production_countries?.map((c) => c?.name).join(',')}</div>
                  )}
                </div>
                {terms?.length > 0 && (
                  <div>
                    <MovieTagsList tags={terms} />
                  </div>
                )}
                {production_companies?.length > 0 && (
                  <div>{production_companies?.map((item) => item?.name).join(', ')}</div>
                )}
              </div>
            </div>
            <div className="container md:mb-10 px-2 py-4 font-lato font-light">
              <div>{work?.overview}</div>
            </div>
            {awards?.length > 0 && (
              <div className="awards flex flex-col space-y-3">
                <h3 className="font-fira text-xl font-semibold">Prix et Récompenses</h3>
                {awards.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center space-x-1 font-lato text-sm font-normal"
                  >
                    <AwardIcon className="w-8 h-8  mr-3 flex-none text-yellow-300" />
                    {a?.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar md:w-4/12 md:block hidden">
          <div>
            {events && events.length > 0 && (
              <>
                {/* <Section title="Voir ce court-métrage en salles" /> */}
                <div className="flex flex-col space-y-2 mb-5">
                  {events.map((event) => {
                    return (
                      <div
                        className={classNames(
                          'flex relative justify-start space-x-2 bg-bastille rounded p-3',
                          {
                            'border-b border-wild-strawberry-dark': event?.event_group,
                          },
                        )}
                        key={event.id}
                      >
                        {/* Date Component */}
                        <DateTimeBlock date={event.fullStartDate} />
                        {/* Date Component */}
                        <div className="flex flex-col justify-between">
                          <MediumName name={event?.medium?.name} type={event?.medium?.type} />
                          <MediumAttributes medium={event?.medium} />
                        </div>
                        {event?.event_group && (
                          <div className="absolute bottom-0  right-3 rounded-t-sm text-sm px-2 font-bold text-selago bg-wild-strawberry-dark">{`${event?.event_group.shortTitle}`}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <div>
            <Section title="Vous aimerez aussi">
              <div className="flex flex-col space-y-2">
                <ShortMoviesSuggestionList shortMovieId={work.id} />
              </div>
            </Section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ShortMoviesHomePage;
