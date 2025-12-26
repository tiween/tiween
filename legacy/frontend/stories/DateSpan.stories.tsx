import { Meta, Story } from '@storybook/react/types-6-0';

import React from 'react';
import DateSpan from '../components/Festival/DateSpan';
import { DateTime } from 'luxon';

export default {
  title: 'Festival/DateSpan',
  component: DateSpan,
} as Meta;
const start = DateTime.local();
const end = start.plus({ days: 3 });
export const Default: Story = () => <DateSpan start={start.toString()} end={end.toString()} />;
