/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from "react"
import { Meta } from "@storybook/react/types-6-0"

import ShortMovieCard from "../components/ShortMovie"
import { shortMovies } from "./data"

export default {
  title: "ShortMovie/Single",
  component: ShortMovieCard,
} as Meta

const Template = (args) => <ShortMovieCard {...args} />

export const WithAllArgs = Template.bind({})

WithAllArgs.args = {
  movie: shortMovies[0],
}
// export const Basic: Story = () => <ShortMovieCard />
