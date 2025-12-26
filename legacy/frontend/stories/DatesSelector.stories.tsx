import { Meta, Story } from '@storybook/react/types-6-0';
import { action } from '@storybook/addon-actions';

import React from 'react';
import DatesList from '../components/DatesSelector/DatesList';
import { DateTime } from 'luxon';
export default { title: 'Dates Selector', component: DatesList } as Meta;

const dates = ['2020-08-26', '2020-01-15', DateTime.local().toFormat('yyyy-MM-dd')];

export const OneItem: Story = () => (
  <DatesList
    dates={dates}
    selected={dates[0]}
    handleSelectDate={(item) => {
      action(`selected date:${item}`);
    }}
  />
);
