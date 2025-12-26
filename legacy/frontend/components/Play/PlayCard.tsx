import * as React from 'react';

import AlgoliaHit from '../../shared/models/AlgoliaHit';
import CreativeWork from '../../shared/models/creative-work';
import Image from 'next/image';
import Label from '../shared/Label';
import Link from 'next/link';
import TheaterIcon from '../shared/icons/Theater';
import Title from '../Movie/MovieTitle';
import classNames from 'classnames';
import { creativeWorkImageWithLoader } from '../../shared/services/cdn';
import isEmpty from 'lodash/isEmpty';
import { useRouter } from 'next/router';

interface PlayCardProps {
  hit: CreativeWork & AlgoliaHit;
}

const PlayCard: React.FunctionComponent<PlayCardProps> = ({ hit }) => {
  const { id, title, slug, originalTitle, releaseYear } = hit;
  const { locale } = useRouter();

  const image = creativeWorkImageWithLoader(hit);
  const terms = [
    { name: 'drame', id: '1' },
    { name: 'comédie', id: '2' },
  ];
  return (
    <Link href={`/theatre/${slug}`} passHref key={hit?.objectID || id} locale={locale}>
      <a>
        <div className="bg-bastille p-2 text-white rounded-sm flex justify-start items-start space-x-3">
          <div className="image-wrapper md:w-1/3">
            {!isEmpty(image) && image?.type === 'poster' && (
              <div className={classNames(image.ar)}>
                <Image
                  className="rounded-sm"
                  src={image.hash}
                  alt={title}
                  layout="fill"
                  loader={image.loader}
                />
              </div>
            )}
            {isEmpty(image) && (
              <div className="border border-gray-600  justify-between items-stretch py-10">
                <div className="aspect-w-16 aspect-h-9">
                  <TheaterIcon className="text-gray-400 " />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between flex-col space-y-2">
            <div className="font-lato">
              <span className="text-base font-bold">
                <Title title={title} originalTitle={originalTitle} />
              </span>
              {releaseYear && <span className="text-xs font-lato font-normal">{releaseYear}</span>}
            </div>
            <div className="italic font-fira text-sm">de Essia Jaïbi</div>

            {terms?.length > 0 && (
              <div className="flex space-x-3 mt-9">
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

export default PlayCard;
