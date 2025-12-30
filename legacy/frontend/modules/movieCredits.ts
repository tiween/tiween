import { AppendedCredits } from "../shared/models/appendend-credits"

export const getDirectors = (credits: AppendedCredits): string[] => {
  if (!credits) return []
  const { crew = [] } = credits
  return crew.filter((item) => item.job === "Director").map((item) => item.name)
}

export const getCast = (credits: AppendedCredits): string[] => {
  if (!credits) return []
  const { cast = [] } = credits
  return cast.slice(0, 5).map((item) => item.name)
}
