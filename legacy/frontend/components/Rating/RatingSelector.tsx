import * as React from 'react';
import RatingSelectorWrapper from './RatingSelectorWrapper';

interface IRatingSelectorProps {
  base?: number;
}

const RatingSelector: React.FunctionComponent<IRatingSelectorProps> = ({ base = 5 }) => {
  return <RatingSelectorWrapper base={base} />;
};

export default RatingSelector;
