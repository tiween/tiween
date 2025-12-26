import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import {
  request,
} from '@strapi/helper-plugin';
import qs from 'qs';


const loadOptions = async (inputValue) => {
  const query = {
    type_eq: 'SHORT_MOVIE',
    _q: inputValue,
  };
  const works = await request(`/creative-works/?${qs.stringify(query)}`);

  return works.map((item) => ({
    value: item.id,
    label: `${item.title}`,
    ...item,
  }));
};


const CreativeWorkSelector = ({ onSelectCreativeWork, ...props }) => {
  const [inputValue, setInputValue] = useState(null);
  const handleInputChange = (newValue) => {
    setInputValue(newValue.replace(/\W/g, ''));
  };


  return (
    <div>
      
        <AsyncSelect

          cacheOption
          loadingIndicator
          isClearable
          loadOptions={loadOptions}
          placeholder="Chercher un court métrage"
          // getOptionValue={(option) => {
          //   return get(option, ['id']);
          // }}

          onChange={(selectedWork) => {
            if (selectedWork) {
              const { id: value, title, originalTitle, releaseYear } = selectedWork;
              const label = title === originalTitle ? title : `${title} - ${originalTitle}, ${releaseYear ? `(${releaseYear})` : ''}`;
              onSelectCreativeWork({ label, value });
            }
          }}
          onInputChange={handleInputChange}
          {...props}
        >
        </AsyncSelect>
      
    </div>
  );
};

export default CreativeWorkSelector;
