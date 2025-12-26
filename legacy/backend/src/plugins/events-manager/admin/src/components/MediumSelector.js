import React, { useState } from 'react';

import AsyncSelect from 'react-select/async';
import PropTypes from 'prop-types';
import { StyledToolBarSelector } from './styles';
import qs from 'qs';
import {
  request
} from '@strapi/helper-plugin';
import { useEventContext } from '../contexts/EventsCalendarContext';

const loadOptions = async (inputValue) => {
  const query = qs.stringify({
    filters: {
      name: {
        $containsi: inputValue, // $containsi	Contains (case-insensitive)
      },
    },
  }, {
    encodeValuesOnly: true,
  });


  const options = await request(`/events-manager/mediums/autocomplete?${query}`);
  return options;

};
const MediumSelector = ({ onSelectMedium }) => {
  const eventContext = useEventContext()
  const [, setInputValue] = useState(null);
  const handleInputChange = (newValue) => {
    setInputValue(newValue.replace(/\W/g, ''));
  };

  return (
    <StyledToolBarSelector>
      <AsyncSelect
        cacheOption
        loadingIndicator
        isClearable
        defaultOptions
        placeholder="Salle, Chaine, Emission..."
        loadOptions={loadOptions}
        onChange={(selectedOption) => {
          onSelectMedium(selectedOption);
        }}
        value={eventContext.medium}
        onInputChange={handleInputChange}
      >
      </AsyncSelect>
    </StyledToolBarSelector>

  );
};
MediumSelector.propTypes = {
  onSelectMedium: PropTypes.func.isRequired
};

export default React.memo(MediumSelector);
