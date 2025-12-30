import Category from "./category"

export default interface ShortMovie {
  id: string
  title: string
  originalTitle?: string
  fullVideo?: string
  trailers?: [string]
  image: {
    src: string
    width: string
    height: string
  }
  duration: number
  synopsis?: string
  categories?: Category[]
  languages?: string[]
  countries?: string[]
}
