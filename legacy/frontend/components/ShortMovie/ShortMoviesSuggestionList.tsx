import CreativeWork from '../../shared/models/creative-work';
import Link from 'next/link';
import React from 'react';
import ShortMovieSuggestionItem from './ShortMovieSuggestionItem';
import ShortMovieSuggestionItemSkeleton from './ShortMovieSuggestionItemSkeleton';
import useRequest from '../../shared/hooks/useRequest';

const ShortMoviesSuggestionList: React.FunctionComponent<{ shortMovieId: number }> = ({
  shortMovieId,
}) => {
  const { data } = useRequest<CreativeWork[]>({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/short-movies/${shortMovieId}`,
  });

  return (
    <>
      {!data && (
        <div className="flex flex-col space-y-4 animate-pulse">
          {Array.from(Array(4).keys()).map((item) => (
            <ShortMovieSuggestionItemSkeleton key={`smsik-${item}`} />
          ))}
        </div>
      )}
      {data?.length > 0 &&
        data.map((work) => (
          <Link key={work.id} href={`/court-metrage/${work.slug}`} passHref>
            <a>
              <ShortMovieSuggestionItem work={work} />
            </a>
          </Link>
        ))}
    </>
  );
};

export default ShortMoviesSuggestionList;
