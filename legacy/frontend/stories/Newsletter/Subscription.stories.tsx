import { Meta, Story } from '@storybook/react/types-6-0';

import React from 'react';
import Subscription from '../../components/Newsletter/Subscription';

export default {
  title: 'Newsletter/Subscription',
  component: Subscription,
} as Meta;

export const Base: Story = () => <Subscription />;
