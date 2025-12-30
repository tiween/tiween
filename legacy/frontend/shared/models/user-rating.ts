import { MovieMeta } from "./moviemeta"

export default interface UserRating {
  id: string
  rating: number
  moviemeta: string | MovieMeta
  user: string
}
