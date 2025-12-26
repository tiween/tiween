import * as React from 'react';

import { ar1619ImageLoader, creativeWorkImageWithLoader } from '../../shared/services/cdn';

import CreativeWork from '../../shared/models/creative-work';
import Image from 'next/image';
import MovieTitle from '../Movie/MovieTitle';
import PhotographIcon from '@heroicons/react/outline/PhotographIcon';
import { runtimeToHuman } from '../../shared/services/utils';
const ShortMovieSuggestionItem: React.FunctionComponent<{ work: CreativeWork }> = ({ work }) => {
  const image = creativeWorkImageWithLoader(work);
  return (
    <div className="flex justify-start items-start">
      <div className="mr-2 w-4/12 h-20">
        {image && image?.hash ? (
          <div className="aspect-w-16 aspect-h-9">
            <Image className="rounded" src={image.hash} layout="fill" loader={ar1619ImageLoader} />
          </div>
        ) : (
          <div className="flex justify-center items-center rounded w-full h-20 bg-bastille">
            <PhotographIcon className=" text-mulled-wine w-16 h-16" />
          </div>
        )}
      </div>
      <div className="flex flex-col font-light w-7/12 border-b border-mulled-wine space-y-1 pb-2">
        <div className="font-bold ">
          <MovieTitle title={work.title} originalTitle={work.originalTitle} />
        </div>
        <div className="text-sm ">
          {runtimeToHuman(work?.runtime)}, {work.production_countries?.map((c) => c.name)}
        </div>
      </div>
    </div>
  );
};

export default ShortMovieSuggestionItem;
