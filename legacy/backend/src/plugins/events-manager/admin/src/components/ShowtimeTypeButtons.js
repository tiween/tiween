import { } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';


import PropTypes from 'prop-types';
import React from 'react';
import { FaTape, FaTheaterMasks } from "react-icons/fa";
import { RiMovie2Line } from "react-icons/ri";
import { SHOWTIME_TYPES } from '../constants';

const items = [
  {
    label: 'Long Métrage',
    value: SHOWTIME_TYPES.MOVIE,
    icon: <RiMovie2Line />
  },
  {
    label: 'Court-Métrage',
    value: SHOWTIME_TYPES.SHORT_MOVIE,
    icon: <FaTape />

  },
  {
    label: 'Théatre',
    value: SHOWTIME_TYPES.PLAY,
    icon: <FaTheaterMasks />
  }
];
const EventTypeSelector = ({
  handleOnClick
}) => {


  return (
    <Flex justifyContent="end">
      <Stack spacing={4} horizontal padding={3} >
        {items.map(item => (

          <Button
            key={item.value}
            startIcon={item.icon}
            className="mx-2"
            color="primary" onClick={() => {
              handleOnClick(item.value);
            }}>
            {<div className="textWrapper">
              {item.label}
            </div>}
          </Button>

        ))}
      </Stack>
    </Flex >
  );
};
EventTypeSelector.propTypes = {
  handleOnClick: PropTypes.func,
};
export default EventTypeSelector;
