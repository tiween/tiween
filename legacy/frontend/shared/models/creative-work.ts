import { Company } from "./company"
import { Country } from "./country"
import CreativeWorkPerson from "./creative-work-person"
import Image from "./image"
import Link from "./link"
import Term from "./term"

export default interface CreativeWork {
  id?: number
  title: string
  slug: string
  content_type: "SHORT_MOVIE"
  originalTitle?: string
  releaseYear?: number
  overview?: string
  poster: Image
  cast: CreativeWorkPerson[]
  crew: CreativeWorkPerson[]
  links: Link[]
  terms: Term[]
  production_countries: Country[]
  production_companies: Company[]
  videos: Array<{
    title: string
    url: string
    type: "FULL_LENGTH" | "CLIP" | "TEASER"
  }>
  cover?: Image
  photos?: Image[]
  awards: Array<{
    id: string
    name: string
    year?: number
  }>
  type: "SHORT_MOVIE" | "PLAY"
  runtime?: number
}
