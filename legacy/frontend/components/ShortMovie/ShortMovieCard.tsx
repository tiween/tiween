import * as React from 'react';

import AlgoliaHit from '../../shared/models/AlgoliaHit';
import CreativeWork from '../../shared/models/creative-work';
import Image from 'next/image';
import Label from '../shared/Label';
import Link from 'next/link';
import Title from '../Movie/MovieTitle';
import { cdnTransformedImage } from '../../shared/services/cdn';
import isEmpty from 'lodash/isEmpty';
import { useRouter } from 'next/router';

interface IShortMovieCardProps {
  hit: CreativeWork & AlgoliaHit;
}

const customImageLoader = ({ src, width }): string => {
  return cdnTransformedImage(src, `ar-16:9,c-force,fo-auto,w-${width}`);
};

const ShortMovieCard: React.FunctionComponent<IShortMovieCardProps> = ({ hit }) => {
  const { id, title, slug, poster, originalTitle, runtime, terms, cover } = hit;
  const { locale } = useRouter();

  let image;
  if (!isEmpty(cover)) {
    image = cover;
  } else if (!isEmpty(poster)) {
    image = poster;
  }
  return (
    <Link href={`/court-metrage/${slug}`} passHref key={hit?.objectID || id} locale={locale}>
      <a>
        <div className="bg-bastille p-2 text-white space-y-2 shadow rounded flex flex-col space-y-5 justify-start">
          {!isEmpty(image) && (
            <div className="aspect-w-16 aspect-h-9 shadow-inner">
              <Image
                className=""
                src={image.hash}
                alt={title}
                layout="fill"
                loader={customImageLoader}
              />
            </div>
          )}
          <div className="flex flex-col space-y-5 ">
            <div className="flex justify-between font-lato">
              <span className="text-base font-bold">
                <Title title={title} originalTitle={originalTitle} />
              </span>
              <span className="text-sm font-lato font-normal">{`${runtime} min`}</span>
            </div>

            {/* {about && <p className="text-sm font-light">{about}</p>} */}
            {terms?.length > 0 && (
              <div className="flex space-x-4">
                {terms?.map((term) => (
                  <Label term={term} key={term.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </a>
    </Link>
  );
};

export default ShortMovieCard;
