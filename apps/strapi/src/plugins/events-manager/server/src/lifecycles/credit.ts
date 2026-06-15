import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"

const { ApplicationError } = errors

const CREDIT_UID = "plugin::events-manager.credit"

// Detecte si une relation est "presente" dans le payload, quelle que soit
// la forme envoyee (id numerique, documentId, ou objet connect/set).
function relationPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") {
    const v = value as Record<string, unknown>
    if (Array.isArray(v.connect)) return v.connect.length > 0
    if (Array.isArray(v.set)) return v.set.length > 0
    if ("id" in v || "documentId" in v) return true
    return false
  }
  return true // id scalaire
}

function assertExactlyOneWork(data: Record<string, any>) {
  const hasMovie = relationPresent(data.movie)
  const hasPlay = relationPresent(data.play)
  if (hasMovie && hasPlay) {
    throw new ApplicationError(
      "A credit cannot reference both a movie and a play."
    )
  }
  if (!hasMovie && !hasPlay) {
    throw new ApplicationError(
      "A credit must reference exactly one work (movie or play)."
    )
  }
}

/**
 * Enforces the polymorphic invariant on Credit: exactly one of the
 * movie / play relations must be set. Strapi cannot express this in
 * the schema, so it is enforced at the database lifecycle layer.
 */
export function registerCreditSubscriber({ strapi }: { strapi: Core.Strapi }) {
  strapi.db.lifecycles.subscribe({
    models: [CREDIT_UID],

    async beforeCreate(event) {
      assertExactlyOneWork(event.params.data ?? {})
    },

    async beforeUpdate(event) {
      const data = event.params.data ?? {}
      // On ne valide que si l'une des relations oeuvre est touchee par la mise a jour.
      if ("movie" in data || "play" in data) {
        assertExactlyOneWork(data)
      }
    },
  })
}
