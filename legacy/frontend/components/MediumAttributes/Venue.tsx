import React from 'react';
import get from 'lodash/get';
import { Medium } from '../../shared/models/medium';

const Venue: React.FC<{ medium: Medium }> = ({ medium }) => {
  const venueAttributes = get(medium, ['mediumType', 0, 'location'], null);
  return (
    <>
      {venueAttributes ? (
        <div className="text-xs">
          {venueAttributes?.street}, {venueAttributes?.region?.name}
        </div>
      ) : (
        <></>
      )}
    </>
  );
  return <div></div>;
};

export default Venue;
