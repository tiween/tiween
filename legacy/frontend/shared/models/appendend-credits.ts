import { CastPerson } from "./cast-person"
import { CrewPerson } from "./crew-person"

export interface AppendedCredits {
  cast: CastPerson[]
  crew: CrewPerson[]
}
