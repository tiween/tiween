import * as React from 'react';

import { GetStaticPaths, GetStaticProps } from 'next';

import BaseContent from '../../shared/models/BaseContent';
import DateSpan from '../../components/Festival/DateSpan';
import EventGroup from '../../shared/models/event-group';
import EventGroupCalendar from '../../components/Event/EventGroupCalendar';
// import EventGroupHeader from '../../components/EventGroup/EventGroupHeader';
import { EventGroupProvider } from '../../shared/context/EventGroupContext';
import Head from 'next/head';
import Image from 'next/image';
import Layout from '../../components/shared/Layout';
import PageStickyBar from '../../components/shared/PageStickyBar';
import StrapiApiResponse from '../../shared/models/strapi-api-response';
import dynamic from 'next/dynamic';
import get from 'lodash/get';
import { posterImageLoader } from '../../shared/services/cdn';
import { request } from '../../shared/services/strapi';

const SectionMovies = dynamic(() => import('../../components/shared/SectionMovies'));
export const getStaticPaths: GetStaticPaths = async () => {
  // Call an external API endpoint to get posts
  const {
    data: { data: results },
  } = await request<StrapiApiResponse<EventGroup>>('/event-groups?_limit=-1');

  const paths = results.map(({ attributes: { slug } }) => ({
    params: {
      slug: slug,
    },
  }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const {
    data: { data: results },
  } = await request<StrapiApiResponse<EventGroup>>(
    `/event-groups?filters[slug][$eq]=${params.slug}&populate[]=poster`,
  );
  return { props: { eventGroup: results[0] } };
};
const EventGroupPage = ({ eventGroup }: { eventGroup: BaseContent<EventGroup> }) => {
  const {
    attributes: { sections, poster, title, subtitle, startDate, endDate },
  } = eventGroup;
  const homePageDisplayImage = get(eventGroup, ['homepage_display', 'image'], null);
  let openGraphImage = get(poster, ['data', 0, 'attributes', 'url'], null);
  if (homePageDisplayImage) {
    openGraphImage = homePageDisplayImage.url;
  }
  console.log('---->', poster.data[0].attributes.hash);

  return (
    <EventGroupProvider value={eventGroup}>
      <Layout>
        <Head>
          <title>Tiween: {`${title}, ${subtitle}`}</title>
          <meta
            key="description"
            name="description"
            content={`Toutes les informations pratiques sur ${title} ${subtitle}`}
          />
          <meta key="og-title" name="og:title" content={`${title}, ${subtitle}`} />
          <meta key="og-image" name="og:image" content={`${openGraphImage}`} />
          <meta
            key="og-description"
            name="og:description"
            content={`Toutes les informations pratiques sur ${title} ${subtitle}`}
          />
        </Head>
        <div className="">
          <PageStickyBar>
            <div className="event-group-page-sticky-bar flex h-24 w-full">
              <div className="w-14 h-full mr-2">
                <div className="aspect-w-2 aspect-h-3">
                  <Image
                    className="rounded"
                    src={poster.data[0].attributes.hash}
                    loader={posterImageLoader}
                    layout="fill"
                    alt={`${title}, ${subtitle}`}
                  />
                </div>
              </div>

              <div className="w-full flex flex-col">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs font-base pl-1">{subtitle}</div>
                <div className="text-xs font-light text-gray-300 pl-1">
                  <DateSpan start={startDate} end={endDate} />
                </div>
              </div>
            </div>
          </PageStickyBar>
        </div>
        <div className="container md:max-w-6xl w-full">
          {/* <EventGroupHeader {...eventGroup.attributes} /> */}
          <div className="mb-10">
            <EventGroupCalendar />
          </div>

          {sections?.length > 0 &&
            sections.map((section) => {
              switch (section.__component) {
                case 'section.movies':
                  return <SectionMovies key={section.id} section={section} />;
              }
            })}
        </div>
      </Layout>
    </EventGroupProvider>
  );
};

export default EventGroupPage;
