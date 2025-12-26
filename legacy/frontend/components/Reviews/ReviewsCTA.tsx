import ReviewIcon from '@heroicons/react/solid/AnnotationIcon';
import { signIn, useSession } from 'next-auth/react';
import React from 'react';
import { useReview } from '../../shared/context/UserReviewContext';
import MovieNavigationItem from '../Movie/MovieNavigation/MovieNavigationItem';
import RatingSelector from '../Rating/SignedInRatingSelector';

const ReviewsCTA: React.FunctionComponent = () => {
  const { status } = useSession();
  const { setShowReviewModal } = useReview();

  return (
    <>
      <div className="grid grid-cols-2 text-center bg-bastille-light rounded-sm m-5 overflow-hidden">
        <div className=" flex w-full col-span-2 justify-between divide-x divide-bastille-lighter">
          {/* <MovieNavigationItem>
            <button
              disabled={!isEmpty(userRating)}
              className={classNames(
                'flex justify-items-center rounded-sm uppercase text-xs font-semibold space-x-1 place-content-center',
                {
                  'text-bastille-lighter': !isEmpty(userRating),
                },
              )}
            >
              <BookMarkIcon className="w-5 h-5" />
              <span className="">Envie de voir</span>
            </button>
          </MovieNavigationItem> */}
          <MovieNavigationItem className="w-full col-span-2">
            <button
              className="w-full justify-center flex space-x-1  uppercase  text-xs font-semibold"
              onClick={() => {
                // setShowReviewModal(true);
                if (status === 'unauthenticated') {
                  signIn();
                } else if (status === 'authenticated') {
                  setShowReviewModal(true);
                }
              }}
            >
              <ReviewIcon className="w-5 h-5" />
              <span>rédiger ma critique</span>
            </button>
          </MovieNavigationItem>
        </div>

        <MovieNavigationItem className="flex flex-col col-span-2 w-full justify-center border-t border-bastille-lighter">
          <span className="uppercase font-bold">Noter</span>
          <RatingSelector />
        </MovieNavigationItem>
      </div>
    </>
  );
};

export default ReviewsCTA;
