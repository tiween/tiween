import * as React from 'react';

import { ar1619ImageLoader, posterImageLoader } from '../../shared/services/cdn';

import CreativeWork from '../../shared/models/creative-work';
import Image from 'next/image';
import Label from '../shared/Label';
import Link from 'next/link';
import { Show } from '../../shared/models/show';
import TimeTableList from '../TimeTableList';
import Title from '../Movie/MovieTitle';
import classNames from 'classnames';
import countries from '../../shared/constants/countries';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
interface IEventBlockShortMovieCardProps {
  work: CreativeWork;
  shows?: Show[];
  showTimeTable?: boolean;
}

const EventBlockShortMovieCard: React.FunctionComponent<IEventBlockShortMovieCardProps> = ({
  work,
  shows,
  showTimeTable = true,
}) => {
  const { title, poster, originalTitle, runtime, terms, photos, production_countries, slug, id } =
    work;
  let image;
  if (!isEmpty(poster)) {
    image = {
      ar: 'aspect-w-2 aspect-h-3',
      loader: posterImageLoader,
      ...poster,
    };
  } else if (!isEmpty(photos)) {
    image = {
      ar: 'aspect-w-16 aspect-h-9',
      loader: ar1619ImageLoader,
      ...photos[0],
    };
  }

  return (
    <Link href={`/court-metrage/${slug}`} passHref key={id}>
      <a className="block">
        <div className=" text-white space-x-3 flex justify-start w-full">
          <div className="md:max-w-lg w-full flex space-x-3">
            {/* poster or cover */}
            {!isEmpty(image) && (
              <div className="w-28 flex-none">
                <div className={classNames(image.ar)}>
                  <Image
                    className="rounded-sm"
                    src={image.hash}
                    alt={title}
                    layout="fill"
                    loader={image.loader}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-2 ">
              <div className="flex flex-col  justify-between font-lato">
                <span className="text-base font-bold">
                  <Title title={title} originalTitle={originalTitle} />
                </span>
                <span className="text-sm font-lato font-normal">{`${runtime} min`}</span>
              </div>
              {production_countries?.length > 0 && (
                <div className="flex space-x-4">
                  {production_countries?.map((c) => get(countries[c.iso_3166_1], c.name)).join()}
                </div>
              )}
              {terms?.length > 0 && (
                <div className="flex space-x-4">
                  {terms?.map((term) => (
                    <Label term={term} key={term.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
          {showTimeTable && shows?.length > 0 && (
            <div className="">
              <TimeTableList shows={shows} />
            </div>
          )}
        </div>
      </a>
    </Link>
  );
};

export default EventBlockShortMovieCard;
