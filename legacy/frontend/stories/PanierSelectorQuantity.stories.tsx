import { Meta, Story } from '@storybook/react/types-6-0';
import { action } from '@storybook/addon-actions';

import React from 'react';
import QuantitySelector from '../components/Quantity/QuantitySelector';
export default { title: 'QuantitySelector', component: QuantitySelector } as Meta;


export const OneItem: Story = () => (
  <QuantitySelector />
);