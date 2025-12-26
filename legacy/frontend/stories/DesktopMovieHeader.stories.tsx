import { Meta, Story } from '@storybook/react/types-6-0';
import sample from 'lodash/sample';
import React from 'react';
import DesktopMovieHeader from '../components/Movie/DesktopMovieHeader';
import { MovieProvider } from '../shared/context/movie.context';
import { movies } from './data';
const movie = sample(movies);
export default {
  title: 'Movie/MovieHeader/Desktop',
  component: DesktopMovieHeader,
  // decorators: [
  //   (Story) => (
  //     // <MovieProvider movie={movie}>
  //     //   <div className="text-selago">
  //     //     <Story />
  //     //   </div>
  //     // </MovieProvider>
  //   ),
  // ],
} as Meta;

export const Desktop: Story = () => <DesktopMovieHeader />;

Desktop.parameters = {
  viewport: {
    defaultViewport: 'desktop',
  },
};
