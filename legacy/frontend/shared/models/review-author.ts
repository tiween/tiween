import Image from "./image"

export default interface ReviewAuthor {
  id: string
  username: string
  provider: string
  short_bio?: string
  profile_picture?: Image
  fullName?: string
}
