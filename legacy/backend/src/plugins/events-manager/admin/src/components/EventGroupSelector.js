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
      title: {
        $contains: inputValue,
      },
    },
  }, {
    encodeValuesOnly: true,
  });

  
  const options = await request(`/events-manager/event-group/autocomplete?${query}`);
  return options;
};

const EventGroupSelector = ({ onSelectEventGroup }) => {
  const eventContext = useEventContext()
  const [inputValue, setInputValue] = useState(null);
  
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
        placeholder="Festival,Cycle..."
        loadOptions={loadOptions}
        onChange={(selectedOption) => {
          onSelectEventGroup(selectedOption);
        }}
        value={eventContext.eventGroup}
        onInputChange={handleInputChange}
      >
      </AsyncSelect>
    </StyledToolBarSelector>

  );
};
EventGroupSelector.propTypes = {
  onSelectEventGroup: PropTypes.func.isRequired
};

export default EventGroupSelector;
