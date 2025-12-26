import dynamic from 'next/dynamic';
import * as React from 'react';
import Event from '../../shared/models/event';
import MediumMeta from '../Medium/MediumMeta';
import MediumName from '../Medium/MediumName';
import Time from './Time';
import Link from 'next/link';
const SingleWork = dynamic(() => import('./SingleWork'));
const MultipleWorks = dynamic(() => import('./MultipleWorks'));
interface IEventBlockProps {
  event: Event;
  rightBlock?: React.ReactNode;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getEventWrapper = (showtimesLength: number) => {
  let Wrapper;
  if (showtimesLength === 1) {
    Wrapper = SingleWork;
  } else if (showtimesLength > 1) {
    Wrapper = MultipleWorks;
  }
  return Wrapper;
};

const EventBlock: React.FunctionComponent<IEventBlockProps> = ({ event, rightBlock }) => {
  const Wrapper = getEventWrapper(event?.showtimes?.length);

  return (
    <div className="rounded text-selago">
      <div className="event-block-wrapper border-mulled-wine">
        <Wrapper event={event} rightBlock={rightBlock}>
          <div className="flex md:flex-col flex-row justify-start md:space-x-0 space-x-4 px-4 py-2 w-full">
            <div className="md:text-3xl text-2xl">
              <Time date={event.fullStartDate} />
            </div>
            <div className="md:text-lg text-base">
              <Link href={`/medium/${event?.medium?.slug}`} passHref>
                <a>
                  <MediumName name={event?.medium.name} type={event.medium.type} />
                  <MediumMeta medium={event?.medium} />
                </a>
              </Link>
            </div>
          </div>
        </Wrapper>
      </div>
    </div>
  );
};

export default EventBlock;
