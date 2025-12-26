import React from 'react';
import PhotographIcon from '@heroicons/react/solid/PhotographIcon';
const ShortMovieSuggestionItemSkeleton: React.FunctionComponent = () => {
  return (
    <div className="flex justify-start items-start">
      <div className="flex rounded justify-center items-center bg-gray-500  h-20 mr-2 w-5/12">
        <PhotographIcon className="w-16 h-16 text-bastille" />
      </div>
      <div className="flex flex-col justify-between items-stretch   w-7/12 space-y-1 h-full">
        <div className="w-full bg-gray-500 h-6 rounded-sm mb-2" />

        <div className="w-full bg-gray-500 h-4 rounded-sm " />
        <div className="w-full bg-gray-500 h-3 rounded-sm " />
        <div className="w-full bg-gray-500 h-2 rounded-sm " />
      </div>
    </div>
  );
};

export default ShortMovieSuggestionItemSkeleton;
