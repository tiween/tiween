/**
 * Map creative work type to display category
 */
export function mapTypeToCategory(type?: string): string {
  const mapping: Record<string, string> = {
    film: "Cinéma",
    "short-film": "Courts-métrages",
    play: "Théâtre",
    concert: "Musique",
    exhibition: "Expositions",
  }
  return mapping[type || ""] || "Événement"
}

/**
 * Map UI category to creative work type
 */
export function mapCategoryToType(
  category: string
): "film" | "short-film" | "play" | "concert" | "exhibition" | undefined {
  const mapping: Record<
    string,
    "film" | "short-film" | "play" | "concert" | "exhibition"
  > = {
    cinema: "film",
    shorts: "short-film",
    theater: "play",
    music: "concert",
    exhibitions: "exhibition",
  }
  return mapping[category.toLowerCase()]
}
