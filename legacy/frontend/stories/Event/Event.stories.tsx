import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import EventGroupItem from '../../components/Event/EventGroupCalendar';
// import  eventGroups } from '../data';

export default {
  component: EventGroupItem,
  title: 'Event/EventGroup',
  decorators: [(story) => <div className="container bg-cinder py-10">{story()}</div>],
} as Meta;

export const EventGroupSingleItem: Story = () => (
  <div>Hello</div>
  // <EventGroupItem eventGroup={sample(eventGroups)} />
);
