import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';

import MobileAutocomplete from '../components/Search/Autocomplete';
import MobileToolBar from '../components/shared/MobileToolBar';

export default {
  title: 'Search/Mobile',
  component: MobileAutocomplete,
  decorators: [
    (Story) => (
      <>
        <Story />
        <MobileToolBar />
      </>
    ),
  ],
} as Meta;

export const Base: Story = () => <MobileAutocomplete />;

Base.parameters = {
  viewport: {
    viewports: INITIAL_VIEWPORTS,
    defaultViewport: 'galaxys9',
  },
};
