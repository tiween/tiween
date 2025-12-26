import React from 'react';
import { Festival } from '../../shared/models/festival';
import FestivalHomePageCard from './FestivalHomePageCard';

type FestivalsListProps = {
  festivals: Festival[];
};
const FestivalsList: React.FC<FestivalsListProps> = ({ festivals }) => {
  return (
    <div>
      {festivals.map((festival) => (
        <FestivalHomePageCard key={festival.id} festival={festival} />
      ))}
    </div>
  );
};

export default FestivalsList;
