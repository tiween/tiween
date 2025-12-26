import React, { useState } from 'react';

import AsyncSelect from 'react-select/async';
import TMDBMovieSelectorOption from './TMDBMovieSelectorOption';
import axiosInstance from '../utils/axiosInstance'
import get from 'lodash/get';
import styled from 'styled-components'

const loadOptions = async (inputValue) => {

  try {
    const response = await axiosInstance.get('/tmdb/search-movies', {
      params: {
        q: inputValue
      }
    });
    const results = get(response, ['data', 'results'], []);
    
return results;
  } catch (e) {
    console.error('loadOptions error', e);
  }
};



function TMDBMovieSelector({ onSelectMovie, ...props }) {
  const [inputValue, setInputValue] = useState(null);
  const handleInputChange = (newValue) => {
    setInputValue(newValue.replace(/\W/g, ''));
  };
  
return (

    <AsyncSelect
      components={{ Option: TMDBMovieSelectorOption }}
      cacheOption
      loadingIndicator
      isClearable
      loadOptions={loadOptions}
      placeholder="The Shawshank Redemption"
      getOptionValue={(option) => {
        return get(option, ['id']);
      }}

      onChange={(selectedMovie) => {
        if (selectedMovie) {
          const { id: value, title, original_title, year } = selectedMovie;
          const label = title === original_title ? title : `${title} - ${original_title}, ${year ? `(${year})` : ''}`;
          onSelectMovie({ label, value });
        }
      }}
      onInputChange={handleInputChange}
      menuPortalTarget={document.body}
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
      {...props}
    />
  );
}

export default TMDBMovieSelector;
