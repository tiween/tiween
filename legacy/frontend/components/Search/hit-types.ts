import { Hit } from "@algolia/client-search"

export type MovieHit = {
  title: string
  slug: string
  objectID: string
  poster_path?: string
  original_title?: string
  release_date?: string
  directors?: Array<string>
  _highlightResult: {
    name?: {
      value: string
    }
    title?: {
      value: string
    }
    original_title: {
      value: string
    }
  }
}

export type MediumHit = {
  name: string
  objectID: string
  streetName?: string
  slug?: string
  _highlightResult: {
    name?: {
      value: string
    }
    region?: {
      value: string
    }
  }
}

export type AutocompleteItem = Hit<MovieHit | MediumHit>
