import * as React from 'react';

/* eslint-disable @typescript-eslint/no-unused-vars */
import Image from 'next/image';
import ReviewAuthorModel from '../../shared/models/review-author';
import { personPhotoImageLoader } from '../../shared/services/cdn';

type ReviewAuthorProps = {
  author: ReviewAuthorModel;
};

const ReviewAuthor: React.FunctionComponent<ReviewAuthorProps> = ({
  author: { username, profile_picture, short_bio, provider, fullName },
}) => {
  let profilePictureToDisplay;
  // if (provider === 'facebook') {
  // }
  return (
    <>
      <div className="flex space-x-2">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 ">
            <div className="aspect-w-1 aspect-h-1">
              <Image
                src={'Photo_Sarra_Grira'}
                loader={personPhotoImageLoader}
                layout="fill"
                className="rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{fullName}</p>
          <p className="text-xs font-thin ">{short_bio}</p>
        </div>
      </div>
    </>
  );
};

export default ReviewAuthor;
