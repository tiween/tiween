/**
 * Crew grouping and role labels (SPAGE-03, D-09, D-10).
 */
import { describe, expect, it } from "vitest"

import type { ShortFilmCrewCredit } from "../types"
import type { RoleTranslator } from "./crew"

import {
  DEPARTMENT_ORDER,
  groupCrewByDepartment,
  humanizeSlug,
  resolveRoleLabel,
} from "./crew"

function credit(
  name: string,
  department: string,
  roleSlug: string,
  extra: Partial<ShortFilmCrewCredit> = {}
): ShortFilmCrewCredit {
  return {
    person: { slug: name.toLowerCase().replace(/\s+/g, "-"), name },
    roleSlug,
    department,
    ...extra,
  }
}

describe("DEPARTMENT_ORDER", () => {
  it("is the fixed render order", () => {
    expect([...DEPARTMENT_ORDER]).toEqual([
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
    ])
  })
})

describe("groupCrewByDepartment", () => {
  it("returns an empty array for no credits", () => {
    expect(groupCrewByDepartment([])).toEqual([])
    expect(groupCrewByDepartment(undefined)).toEqual([])
  })

  it("orders groups by the fixed department order, not by input order", () => {
    const groups = groupCrewByDepartment([
      credit("A", "music", "composer"),
      credit("B", "editing", "editor"),
      credit("C", "directing", "director"),
      credit("D", "stage", "stage-manager"),
      credit("E", "camera", "director-of-photography"),
    ])
    expect(groups.map((group) => group.department)).toEqual([
      "directing",
      "camera",
      "editing",
      "music",
      "stage",
    ])
  })

  it("omits empty groups", () => {
    const groups = groupCrewByDepartment([credit("A", "sound", "sound-mixer")])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.department).toBe("sound")
  })

  it("sorts by billing ascending with null and undefined last, keeping API order for ties", () => {
    const groups = groupCrewByDepartment([
      credit("Unbilled first", "production", "producer"),
      credit("Third", "production", "producer", { billing: 3 }),
      credit("First", "production", "producer", { billing: 1 }),
      credit("Tie A", "production", "producer", { billing: 2 }),
      credit("Tie B", "production", "producer", { billing: 2 }),
      credit("Unbilled second", "production", "producer"),
    ])
    expect(groups[0]?.credits.map((c) => c.person.name)).toEqual([
      "First",
      "Tie A",
      "Tie B",
      "Third",
      "Unbilled first",
      "Unbilled second",
    ])
  })

  it("files an unknown department under other", () => {
    const groups = groupCrewByDepartment([
      credit("A", "catering", "caterer"),
      credit("B", "other", "thanks"),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.department).toBe("other")
    expect(groups[0]?.credits.map((c) => c.person.name)).toEqual(["A", "B"])
  })

  it("keeps two roles of the same person in one department as two rows", () => {
    const groups = groupCrewByDepartment([
      credit("Anis Lassoued", "directing", "director"),
      credit("Anis Lassoued", "directing", "assistant-director"),
    ])
    expect(groups[0]?.credits).toHaveLength(2)
  })

  it("does not mutate its input", () => {
    const input = [
      credit("B", "sound", "sound-mixer", { billing: 2 }),
      credit("A", "sound", "sound-mixer", { billing: 1 }),
    ]
    groupCrewByDepartment(input)
    expect(input.map((c) => c.person.name)).toEqual(["B", "A"])
  })
})

describe("humanizeSlug", () => {
  it("turns a slug into a sentence-case label", () => {
    expect(humanizeSlug("sound-mixer")).toBe("Sound mixer")
    expect(humanizeSlug("director")).toBe("Director")
    expect(humanizeSlug("first_assistant--camera")).toBe(
      "First assistant camera"
    )
  })

  it("returns an empty string for a blank slug", () => {
    expect(humanizeSlug("")).toBe("")
    expect(humanizeSlug("---")).toBe("")
  })
})

describe("resolveRoleLabel", () => {
  const catalog: Record<string, string> = {
    "crew.roles.director": "Réalisation",
    "crew.roles.sound-mixer": "Mixage",
    "crew.departments.other": "Autres",
  }
  const t: RoleTranslator = Object.assign(
    (key: string) => catalog[key] ?? `MISSING:${key}`,
    { has: (key: string) => key in catalog }
  )

  it("lets a non-blank customRole win, trimmed", () => {
    expect(
      resolveRoleLabel(
        credit("A", "directing", "director", {
          customRole: "  Co-réalisation ",
        }),
        t
      )
    ).toBe("Co-réalisation")
  })

  it("ignores a blank customRole", () => {
    expect(
      resolveRoleLabel(
        credit("A", "directing", "director", { customRole: "   " }),
        t
      )
    ).toBe("Réalisation")
  })

  it("uses the locale label when the translator has the key", () => {
    expect(resolveRoleLabel(credit("A", "sound", "sound-mixer"), t)).toBe(
      "Mixage"
    )
  })

  it("humanizes a slug the catalog does not know", () => {
    expect(resolveRoleLabel(credit("A", "camera", "drone-pilot"), t)).toBe(
      "Drone pilot"
    )
  })

  it("never throws or probes the translator for a hostile slug", () => {
    const probe: string[] = []
    const spy: RoleTranslator = Object.assign((key: string) => `T:${key}`, {
      has: (key: string) => {
        probe.push(key)
        return true
      },
    })
    const label = resolveRoleLabel(
      credit("A", "other", "../../a.b{c}", {}),
      spy
    )
    expect(label.length).toBeGreaterThan(0)
    expect(probe.some((key) => key.includes("{"))).toBe(false)
    expect(probe.some((key) => key.includes(".."))).toBe(false)
  })

  it("never returns an empty string", () => {
    const label = resolveRoleLabel(credit("A", "other", ""), t)
    expect(label.trim().length).toBeGreaterThan(0)
  })
})
