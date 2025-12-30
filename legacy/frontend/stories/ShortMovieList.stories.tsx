import ShortMovieList from "../components/ShortMovie/ShortMovieList"
import { shortMovies } from "./data"

export default {
  component: ShortMovieList,
  title: "ShortMovie/List",
}

const Template = (args) => <ShortMovieList {...args} />

export const Default = Template.bind({})
Default.args = {
  // Shaping the stories through args composition.
  // The data was inherited from the Default story in task.stories.js.
  movies: shortMovies,
}
