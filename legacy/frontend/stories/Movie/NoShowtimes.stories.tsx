import { Meta, Story } from "@storybook/react/types-6-0"
import sample from "lodash/sample"

import NoShowtimes from "../../components/Movie/NoShowtimes"
import { movies } from "../data"

const movie = sample(movies)
export default {
  component: NoShowtimes,
  title: "Movie/NoShowtimes",
  decorators: [
    (Story) => (
      <div className="text-selago container p-10">
        <Story />
      </div>
    ),
  ],
} as Meta

export const NoShowtimeForMovie: Story = () => (
  <NoShowtimes
    message={`Il n'y a malheureusement pas seances pour le film ${movie.title} en ce moment`}
  />
)
