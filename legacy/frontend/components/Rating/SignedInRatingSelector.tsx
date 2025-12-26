import React, { useState } from 'react';

import HeartIcon from '@heroicons/react/solid/HeartIcon';
import RatingSkeleton from './RatingSkeleton';
import UserRating from '../../shared/models/user-rating';
import XCircleIcon from '@heroicons/react/solid/XCircleIcon';
import axios from 'axios';
import classNames from 'classnames';
import get from 'lodash/get';
import { useMovie } from '../../shared/context/movie.context';
import useRequest from '../../shared/hooks/useRequest';
import { useSession } from 'next-auth/react';

interface IRatingSelectorProps {
  base?: number;
  canReset?: boolean;
  readOnly?: boolean;
}

const RatingSelector: React.FunctionComponent<IRatingSelectorProps> = ({
  base = 5,
  canReset = true,
}) => {
  const { id } = useMovie();
  const { data: session, status } = useSession();

  const [isSendingRating, setIsSendingRating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const requestConfig = {
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/rating/${id}`,
  };

  const { data: userRating, mutate } = useRequest<UserRating>(requestConfig);
  const userRatingValue = get(userRating, ['rating'], 0);
  const [hover, setHover] = useState(userRatingValue);

  const resetRating = (): void => {
    setIsResetting(true);

    axios
      .delete(`${process.env.NEXT_PUBLIC_BASE_URL}/user/rating/delete/${userRating.id}`)
      .then(() => {
        setHover(0);
        setIsResetting(false);
        mutate();
      })
      .catch((error) => {
        console.error('sendRating ERROR resetRating', error);
      })
      .finally(() => {
        setIsResetting(false);
      });
  };
  const sendRating = (rating: number): void => {
    const userId = session.id;
    const token = session.jwt;
    setIsSendingRating(true);
    // mutate({ ...userRating, rating }, false);
    axios
      .post(`/api/movie/rating`, {
        userId,
        moviemetaId: id,
        rating,
        token,
      })
      .then(() => {
        mutate();
      })
      .catch(function (error) {
        console.log('sendRating error', error);
      })
      .finally(() => {
        setIsSendingRating(false);
      });
  };

  if (status === 'loading') {
    return <RatingSkeleton />;
  } else {
    return (
      <div className="rating-bar flex justify-center items-center relative pr-6">
        {[...Array(base)].map((_, index) => {
          index = index + 1;
          return (
            <button
              type="button"
              disabled={isSendingRating}
              key={`rating-${index}`}
              onMouseEnter={(e) => {
                e.preventDefault();
                setHover(index);
              }}
              onMouseLeave={(e) => {
                e.preventDefault();
                setHover(userRatingValue);
              }}
              onClick={(e) => {
                e.preventDefault();
                setHover(index);
                sendRating(index);
                return false;
              }}
            >
              <HeartIcon
                className={classNames('h-8 w-8  ', {
                  'text-gold': index <= (hover || userRatingValue),
                  'text-bastille-lighter': index > (hover || userRatingValue),
                })}
              />
            </button>
          );
        })}
        {canReset && userRatingValue > 0 && (
          <div className="absolute  inset-y-0 right-0 ">
            <button className="h-4 w-4 flex items-center" onClick={resetRating}>
              {isResetting || isSendingRating ? (
                <div
                  style={{ borderTopColor: 'transparent' }}
                  className="inset-0 w-4 h-4 border-2 border-wild-strawberry-dark rounded-full animate-spin"
                />
              ) : (
                <XCircleIcon className="text-bastille-lighter hover:text-red-700" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  }
};

export default RatingSelector;
