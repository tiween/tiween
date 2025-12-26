import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import MainNavigation from '../components/MainNavigation';

export default {
  title: 'MainNavigation',
  component: MainNavigation,
} as Meta;

export const LoggedOut: Story = () => <MainNavigation />;
