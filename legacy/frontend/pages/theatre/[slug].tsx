import Carousel from '../../components/shared/Carousel';
import CreativeWork from '../../shared/models/creative-work';
import { CreativeWorkProvider } from '../../shared/context/CreativeWorkContext';
import { DateTime } from 'luxon';
import Event from '../../shared/models/event';
import { GetServerSideProps } from 'next';
import Layout from '../../components/shared/Layout';
import PlayCast from '../../components/Play/PlayCast';
import PlayCrew from '../../components/Play/PlayCrew';
import PlayHeader from '../../components/Play/PlayHeader';
import PlayTimetable from '../../components/Play/PlayTimetable';
import StrapiApiResponse from '../../shared/models/strapi-api-response';
// import HeartIcon from '@heroicons/react/outline/HeartIcon';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import qs from 'qs';
import reduce from 'lodash/reduce';
import { request } from '../../shared/services/strapi';
import set from 'lodash/set';
export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params: { slug },
  } = context;

  const {
    data: { data: results },
  } = await request<StrapiApiResponse<CreativeWork>>(
    `/creative-works?filters[slug][$eq]=${slug}&filters[type][$eq]=PLAY`,
  );

  let timetable;
  const work = results[0];
  if (!isEmpty(results)) {
    const cwId = work.id;
    const params = qs.stringify({
      fullStartDate_gte: DateTime.now().toISO(),
      _sort: 'fullStartDate:ASC',
      'showtimes.creative_work_eq': cwId,
    });

    const {
      data: { data: results },
    } = await request<StrapiApiResponse<Event>>(`/events?${params}`);

    timetable = reduce(
      results,
      (result, value) => {
        const event = value.attributes;
        const day = event.startDate;
        const medium = get(event, ['medium'], null);
        if (medium) {
          if (get(result, [day, medium.id], null)) {
            result[day][medium.id]['shows'].push(event);
          } else {
            set(result, [day, medium.id], { medium, shows: [event] });
          }
        }
        return result;
      },
      {},
    );
  }

  return {
    props: {
      work,
      timetable,
    },
  };
};

const PlayPage: React.FunctionComponent<{ work: CreativeWork; timetable: unknown }> = ({
  work,
  timetable,
}) => {
  const { photos } = work;

  return (
    <CreativeWorkProvider creativeWork={work}>
      <Layout>
        <div className="container flex flex-col mb-16 max-w-6xl px-2">
          <PlayHeader />
          <div className="mb-5">
            <Carousel items={photos} />
          </div>
          {work.overview && (
            <div className="my-2">
              <p className="leading-4 text">{work.overview}</p>
            </div>
          )}

          {/* distribution */}
          <PlayCrew />
          <PlayCast />
          <PlayTimetable timetable={timetable} />
        </div>
      </Layout>
    </CreativeWorkProvider>
  );
};

export default PlayPage;
