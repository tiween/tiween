import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import MoviesList from '../components/Movie/MoviesList';
import { movies } from './data';
import { action } from '@storybook/addon-actions';

export default { title: 'HomePageMovieCards' } as Meta;

export const MobileList: Story = () => {
  return <></>;

  // <MoviesList items={movies} handleShowTrailer={action('show-trailer')} />;
};
MobileList.parameters = {
  viewport: {
    viewports: INITIAL_VIEWPORTS,
    defaultViewport: 'galaxys9',
  },
};
