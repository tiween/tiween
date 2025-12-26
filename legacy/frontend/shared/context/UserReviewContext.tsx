/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { useState, createContext, useContext, useEffect } from 'react';
import Review from '../models/review';

const UserReviewContext = createContext(null);

interface UserReviewProviderProps {
  children: React.ReactNode;
  review?: Review;
}

export const UserReviewProvider: React.FC<UserReviewProviderProps> = ({ review, children }) => {
  const [currentUserReview, setCurrentUserReview] = useState(review);
  useEffect(() => {
    if (review) {
      setCurrentUserReview(review);
    }
  }, [review]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  return (
    <UserReviewContext.Provider
      value={{ review: currentUserReview, showReviewModal, setShowReviewModal }}
    >
      {children}
    </UserReviewContext.Provider>
  );
};

export const useReview = (): {
  review: Review;
  showReviewModal: boolean;
  setShowReviewModal: (show: boolean) => void;
} => useContext(UserReviewContext);
