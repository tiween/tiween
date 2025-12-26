import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';

import { Box } from '@strapi/design-system/Box';
import React from 'react';
import TMDBSettingsForm from '../components/TMDBSettingsForm';

const Settings = () => {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <HeaderLayout
        id="title"
        title="TMDB General settings"
        subtitle="Manage the settings and behaviour of the TMDB plugin"
      ></HeaderLayout>
      <ContentLayout>
        <TMDBSettingsForm />
      </ContentLayout>
    </QueryClientProvider>
  );
};

export default Settings;
