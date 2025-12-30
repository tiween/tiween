import BaseContent from "./BaseContent"
import Event from "./event"
import Image from "./image"
import Section from "./section"

export default interface EventGroup {
  id: number

  title: string
  subtitle?: string
  shortTitle?: string
  description?: string
  slug?: string
  poster?: {
    data: BaseContent<Image>[]
  }
  startDate: string
  endDate: string
  sections: Section[]
  events: Event[]
}
