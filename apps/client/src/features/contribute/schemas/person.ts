import { z } from "zod"

/**
 * Person Creation Schema
 *
 * For creating new persons inline during play contribution
 * Returns error CODES for i18n translation
 */

export const createPersonSchema = z.object({
  name: z
    .string()
    .min(1, "PERSON_NAME_REQUIRED")
    .min(2, "PERSON_NAME_TOO_SHORT")
    .max(100, "PERSON_NAME_TOO_LONG"),
  photo: z.string().optional(), // URL or uploaded file
  nationality: z.string().optional(),
  bio: z.string().max(2000, "BIO_TOO_LONG").optional(),
})

export type CreatePersonData = z.infer<typeof createPersonSchema>

/**
 * Person search result from API
 */
export interface PersonSearchResult {
  id: number
  documentId: string
  name: string
  slug: string
  photo?: {
    id: number
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }
  nationality?: string
}

/**
 * Person reference used in credits
 * Can be either an existing person or a newly created one
 */
export interface PersonSelection {
  documentId?: string // Present for existing persons
  name: string
  isNew?: boolean // True for persons created inline
  photo?: string // URL for display
  nationality?: string
}
