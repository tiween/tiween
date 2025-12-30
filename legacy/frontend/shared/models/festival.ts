import { Show } from "./show"
import { StrapiImage } from "./strapi-image"

export interface Festival {
  id: string
  title: string
  subtitle?: string
  slug: string
  startDate: string
  endDate: string
  description: string
  mainImage: StrapiImage
  showtimes?: Show[]
  homePageDisplay: "hero" | "two_columns"
}
