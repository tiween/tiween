import * as React from 'react';
import HeartIcon from '@heroicons/react/solid/HeartIcon';

interface IRatingSkeletonProps {
  base?: number;
}

const RatingSkeleton: React.FunctionComponent<IRatingSkeletonProps> = ({ base = 5 }) => {
  return (
    <div className="rating-bar flex justify-center items-center animate-pulse">
      {[...Array(base)].map((_, index) => {
        index = index + 1;

        return (
          <div key={`rating-skeleton-${index}`}>
            <HeartIcon className="h-8 w-8 text-bastille-lighter" />
          </div>
        );
      })}
    </div>
  );
};

export default RatingSkeleton;
