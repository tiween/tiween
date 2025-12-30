import Event from "./event"

export default interface Agenda {
  name: string
  id: string
  public: boolean
  events?: Event[]
}
