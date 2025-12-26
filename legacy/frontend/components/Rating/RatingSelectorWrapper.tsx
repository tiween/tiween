import { useSession } from 'next-auth/react';
import React from 'react';
import RatingSelector from './SignedInRatingSelector';
import RatingSkeleton from './RatingSkeleton';
import ReadOnlyRatingSelector from './ReadonlyRatingSelector';

interface IRatingSelectorWrapperProps {
  base: number;
}

const RatingSelectorWrapper: React.FunctionComponent<IRatingSelectorWrapperProps> = ({ base }) => {
  const { status } = useSession();
  if (status === 'unauthenticated') {
    return <ReadOnlyRatingSelector base={base} />;
  } else if (status === 'loading') {
    return <RatingSkeleton />;
  } else {
    return <RatingSelector base={base} />;
  }
};

export default RatingSelectorWrapper;
