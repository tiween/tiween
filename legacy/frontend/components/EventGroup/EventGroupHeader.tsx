import * as React from 'react';

import DateSpan from '../Festival/DateSpan';
import Image from 'next/image';
import PageTitle from '../shared/PageTitle';
import ReactMarkdown from 'react-markdown';
import { posterImageLoader } from '../../shared/services/cdn';

interface IEventGroupHeaderProps {
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  description?: string;
  poster?: any;
}

const EventGroupHeader: React.FunctionComponent<IEventGroupHeaderProps> = ({
  title,
  subtitle,
  startDate,
  endDate,
  description,
  poster,
}) => {
  return (
    <div className="flex md:space-x-4 md:flex-row flex-col mb-3">
      <div className="left-pane flex flex-col md:w-3/4 w-full">
        <div className="title-wrapper mb-3">
          <PageTitle>
            <div className="flex flex-col md:space-y-3 space-y-1">
              <div>{title}</div>
              <div className="font-normal flex flex-col">
                <div className="md:text-3xl text-xl">{subtitle}</div>
                <div className="md:text-xl text-base">
                  <DateSpan start={startDate} end={endDate} />
                </div>
              </div>
            </div>
          </PageTitle>
        </div>
        <div className="md:hidden block mb-3">
          <div className="poster-wrapper aspect-w-2 aspect-h-3">
            <Image
              className="rounded"
              loader={posterImageLoader}
              src={poster.hash}
              layout="fill"
              alt={`${title}, ${subtitle}`}
            />
          </div>
        </div>
        <div className="md:pr-4 text-justify md:text-lg text-sm font-fira font-light">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      </div>

      <div className="right-pane md:w-1/4 md:block hidden">
        <div className="poster-wrapper aspect-w-2 aspect-h-3">
          <Image
            className="rounded"
            src={poster.data[0].attributes.hash}
            loader={posterImageLoader}
            layout="fill"
            alt={`${title}, ${subtitle}`}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(EventGroupHeader);
