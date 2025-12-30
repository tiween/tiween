import React from "react"
import { action } from "@storybook/addon-actions"
import { INITIAL_VIEWPORTS } from "@storybook/addon-viewport"
import { Meta, Story } from "@storybook/react/types-6-0"

import MoviesList from "../components/Movie/MoviesList"
import { movies } from "./data"

export default { title: "HomePageMovieCards" } as Meta

export const MobileList: Story = () => {
  return <></>

  // <MoviesList items={movies} handleShowTrailer={action('show-trailer')} />;
}
MobileList.parameters = {
  viewport: {
    viewports: INITIAL_VIEWPORTS,
    defaultViewport: "galaxys9",
  },
}
