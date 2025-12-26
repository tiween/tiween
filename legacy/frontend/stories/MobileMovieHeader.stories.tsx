import { action } from '@storybook/addon-actions';
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import { Meta, Story } from '@storybook/react/types-6-0';
import sample from 'lodash/sample';
import React from 'react';
import MobileMovieHeader from '../components/Movie/MobileMovieHeader';
import { MovieProvider } from '../shared/context/movie.context';
import { movies } from './data';

const movie = sample(movies);

export default {
  title: 'Movie/MovieHeader/Desktop',
  component: MobileMovieHeader,
  // decorators: [
  //   (Story) => (
  //     <MovieProvider movie={movie}>
  //       <div className="text-selago">
  //         <Story />
  //       </div>
  //     </MovieProvider>
  //   ),
  // ],
} as Meta;

export const Mobile: Story = () => (
  <MobileMovieHeader
    handleShowTrailers={() => {
      action('handleShowTrailers');
    }}
  />
);

Mobile.parameters = {
  viewport: {
    viewports: INITIAL_VIEWPORTS,
    defaultViewport: 'galaxys9',
  },
};
