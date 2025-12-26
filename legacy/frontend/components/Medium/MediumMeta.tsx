import get from 'lodash/get';
import React from 'react';
import LocationIcon from '@heroicons/react/solid/LocationMarkerIcon';
import { Medium } from '../../shared/models/medium';
interface IMediumMetaProps {
  medium: Medium; //TODO: correctly type this
}

const MediumMeta: React.FunctionComponent<IMediumMetaProps> = ({ medium }) => {
  switch (medium.type) {
    case 'VENUE':
      {
        const location = get(medium, ['mediumType', 0, 'location']);
        return location?.street ? (
          <div className="medium-name text-sm font-normal">
            <div className="flex space-x-1 items-top">
              <div className="pt-1">
                <LocationIcon />
              </div>
              <div className="flex flex-col justify-between">
                <div>{location.street}</div>
                {location.city ? <div>{location.city}</div> : <></>}
                {location.region ? <div>{location.region.name}</div> : <></>}
              </div>
            </div>
          </div>
        ) : (
          <></>
        );
      }
      break;
  }
  return;
};

export default MediumMeta;
