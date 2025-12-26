import React from 'react';
import { Medium } from '../../shared/models/medium';
import TvShow from './TvShow';
import Venue from './Venue';

const MediumAttributes: React.FC<{
  medium: Medium;
}> = ({ medium }) => {
  const { type } = medium;
  let component;
  switch (type) {
    case 'VENUE':
      component = <Venue medium={medium} />;
      break;
    case 'TV_SHOW':
      component = <TvShow medium={medium} />;
      break;
  }

  return <div className={medium.type.toLowerCase()}>{component}</div>;
};

export default MediumAttributes;
