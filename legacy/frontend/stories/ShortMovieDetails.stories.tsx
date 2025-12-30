/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from "react"

import ShortMovieMeta from "../components/ShortMovie/ShortMovieDetails"
import { shortMovies } from "./data"

export default {
  component: ShortMovieMeta,
  title: "ShortMovie/Details",
  decorators: [(story) => <div className="bg-cinder mx-auto">{story()}</div>],
}

const Template = (args) => <ShortMovieMeta {...args} />

export const Default = Template.bind({})
Default.args = {
  // Shaping the stories through args composition.
  // The data was inherited from the Default story in task.stories.js.
  movie: shortMovies[0],
}
