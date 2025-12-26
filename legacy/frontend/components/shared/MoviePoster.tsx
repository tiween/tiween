import Image from 'next/image';
import React from 'react';
import { cdnTransformedImage } from '../../shared/services/cdn';

// const CLOUDINARY_FETCH_URI = 'https://res.cloudinary.com/tiween/image/fetch/';
// const TMDB_IMAGE_URIS = {
//   POSTER: 'https://image.tmdb.org/t/p/w370_and_h556_bestv2',
// };
const customImageLoader = ({ src, width }): string => {
  return cdnTransformedImage(src, `ar_2:3,c_thumb,g_auto,w_${width}`);
};

const MoviePoster: React.FC<{
  posterPath: string;
  alt: string;
}> = ({ posterPath, alt }) => {
  console.log('posterPath------>', posterPath);
  return posterPath ? (
    <Image
      className="w-full"
      src={posterPath}
      width={370}
      height={556}
      layout="responsive"
      loader={customImageLoader}
      alt={alt}
    />
  ) : (
    <></>
  );
};

export default MoviePoster;
