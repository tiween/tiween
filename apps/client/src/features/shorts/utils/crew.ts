/**
 * Crew grouping and role labels for the "Équipe artistique" section.
 *
 * D-09: a role label is the editor's `customRole` when set, else the client
 * locale label for `creditRole.slug` (`shorts.crew.roles.<slug>`), else a
 * humanized slug. A label is never blank, and an unknown slug never throws.
 * D-10: credits are grouped by department in a fixed order and sorted by
 * billing inside a group; the same person with two roles keeps two rows.
 */

import type { ShortFilmCrewCredit } from "../types"

/** Fixed render order of the department groups (UI-SPEC A2). */
export const DEPARTMENT_ORDER = [
  "directing",
  "writing",
  "production",
  "camera",
  "editing",
  "sound",
  "music",
  "art",
  "costume-makeup",
  "lighting",
  "stage",
  "other",
] as const

export type CrewDepartment = (typeof DEPARTMENT_ORDER)[number]

export interface CrewGroup {
  department: CrewDepartment
  credits: ShortFilmCrewCredit[]
}

const KNOWN_DEPARTMENTS: ReadonlySet<string> = new Set(DEPARTMENT_ORDER)

/** Slugs allowed to become a catalog key; anything else is humanized only. */
const SAFE_SLUG = /^[a-z0-9-]+$/

function departmentOf(credit: ShortFilmCrewCredit): CrewDepartment {
  return KNOWN_DEPARTMENTS.has(credit.department)
    ? (credit.department as CrewDepartment)
    : "other"
}

function billingOf(credit: ShortFilmCrewCredit): number {
  return typeof credit.billing === "number" && Number.isFinite(credit.billing)
    ? credit.billing
    : Number.POSITIVE_INFINITY
}

/**
 * Group credits by department (fixed order), sorted by billing ascending with
 * unbilled credits last. `Array#sort` is stable, so ties keep the API order.
 * Empty groups are omitted; the input is not mutated.
 */
export function groupCrewByDepartment(
  crew: readonly ShortFilmCrewCredit[] | null | undefined
): CrewGroup[] {
  if (!crew || crew.length === 0) return []

  const byDepartment = new Map<CrewDepartment, ShortFilmCrewCredit[]>()
  for (const credit of crew) {
    const department = departmentOf(credit)
    const bucket = byDepartment.get(department)
    if (bucket) bucket.push(credit)
    else byDepartment.set(department, [credit])
  }

  const groups: CrewGroup[] = []
  for (const department of DEPARTMENT_ORDER) {
    const credits = byDepartment.get(department)
    if (!credits) continue
    groups.push({
      department,
      credits: [...credits].sort((a, b) => billingOf(a) - billingOf(b)),
    })
  }
  return groups
}

/** "sound-mixer" becomes "Sound mixer". Blank in, blank out. */
export function humanizeSlug(slug: string): string {
  const words = slug
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ""
}

/**
 * The minimal translator shape `resolveRoleLabel` needs: callable plus `has`.
 * Keys are relative to the `shorts` namespace.
 */
export interface RoleTranslator {
  (key: string): string
  has: (key: string) => boolean
}

/** The visible role for one credit. Never empty. */
export function resolveRoleLabel(
  credit: ShortFilmCrewCredit,
  t: RoleTranslator
): string {
  const custom = credit.customRole?.trim()
  if (custom) return custom

  const slug = credit.roleSlug?.trim() ?? ""
  if (slug && SAFE_SLUG.test(slug)) {
    const key = `crew.roles.${slug}`
    try {
      if (t.has(key)) {
        const label = t(key).trim()
        if (label) return label
      }
    } catch {
      // A catalog hiccup must not take the page down; fall through.
    }
  }

  const humanized = humanizeSlug(slug)
  if (humanized) return humanized

  // A credit with no usable slug: the department heading is the next best word.
  const departmentKey = `crew.departments.${departmentOf(credit)}`
  try {
    if (t.has(departmentKey)) {
      const label = t(departmentKey).trim()
      if (label) return label
    }
  } catch {
    // fall through
  }
  return humanizeSlug(departmentOf(credit)) || "-"
}
