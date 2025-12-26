import { Meta, Story } from '@storybook/react/types-6-0';

import React from 'react';
import Footer from '../components/shared/Footer';

export default {
  title: 'Footer',
  component: Footer,
} as Meta;

export const LoggedOut: Story = () => <Footer />;
