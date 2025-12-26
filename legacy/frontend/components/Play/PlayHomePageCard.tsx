import * as React from 'react';

import CreativeWork from '../../shared/models/creative-work';
import Image from 'next/image';
import Link from 'next/link';
import get from 'lodash/get';
import { posterImageLoader } from '../../shared/services/cdn';
interface IPlayHomePageCardProps {
  play: CreativeWork;
}

const PlayHomePageCard: React.FunctionComponent<IPlayHomePageCardProps> = ({ play }) => {
  const photoToDisplay = play?.poster;

  const firstCrewMember = get(play, ['crew', 0], null);

  return (
    <Link href={`/theatre/${play.slug}`} passHref>
      <a>
        <div className="play-home-pagecard text-selago">
          <div className="flex flex-col">
            <div className="aspect-w-2 aspect-h-3 relative overflow-hidden rounded-sm mb-2">
              <Image
                className=""
                src={photoToDisplay.hash}
                loader={posterImageLoader}
                layout="fill"
              />
              <div
                className="absolute md:opacity-0 md:hover:opacity-30 opacity-50"
                style={{ backgroundColor: photoToDisplay.colors.Vibrant.hex }}
              />

              <div className="md:hidden flex flex-col  justify-center items-center h-full text-center text-lg font-lato text-shadow-base">
                <span className="">{play.title}</span>
                <span className="font-tajwal font-semibold">{play.originalTitle}</span>
              </div>
            </div>
            <div className="titles md:flex md:flex-col text-sm font-lato justify-between hidden">
              <span className="">{play.title}</span>
              <span className="font-tajwal font-semibold">{play.originalTitle}</span>
            </div>
            {firstCrewMember && (
              <div className="md:flex space-x-1 text-xs text-bastille-200 justify-between hidden">
                <span className="">{firstCrewMember.job?.root || firstCrewMember.job?.name}</span>
                <span className="italic">{firstCrewMember.person.fullName}</span>
              </div>
            )}
          </div>
        </div>
      </a>
    </Link>
  );
};

export default PlayHomePageCard;
