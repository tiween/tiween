/**
 * Translation targets of a work.
 *
 * Pure and React-free, in its own module for the same reason as
 * `WorkForm/publishRules.ts`: the server jest project (the booted
 * `work-editor.service.test.ts`) cannot resolve `@strapi/strapi/admin`, which
 * `useCreativeWorks.ts` imports. The only import here is type-only and erased.
 * `useCreativeWorks.ts` re-exports both names, so existing importers keep
 * working unchanged.
 */
import type { CreativeWork } from "./useCreativeWorks"

/**
 * Documents a translation row of a work points at. Creating a locale row of a
 * work copies its non-localized `credits` and `cast`, whose person, credit-role
 * and character targets are localized, so each target needs a row in that
 * locale first or the server answers `locale "<code>" not found`.
 */
export interface TranslationTargets {
  persons: string[]
  roles: Array<{ documentId: string; name: string; slug?: string | null }>
  characters: Array<{ documentId: string; name: string }>
}

/** Pure: the distinct credited documents of a work, by kind. */
export function collectTranslationTargets(
  work: CreativeWork
): TranslationTargets {
  const persons = new Set<string>()
  const roles = new Map<
    string,
    { documentId: string; name: string; slug?: string | null }
  >()
  const characters = new Map<string, { documentId: string; name: string }>()

  for (const credit of work.credits ?? []) {
    if (credit.person?.documentId) persons.add(credit.person.documentId)
    const role = credit.creditRole
    if (role?.documentId && !roles.has(role.documentId)) {
      roles.set(role.documentId, {
        documentId: role.documentId,
        name: role.name,
        slug: role.slug ?? null,
      })
    }
  }
  for (const member of work.cast ?? []) {
    if (member.person?.documentId) persons.add(member.person.documentId)
    const character = member.character
    if (character?.documentId && !characters.has(character.documentId)) {
      characters.set(character.documentId, {
        documentId: character.documentId,
        name: character.name,
      })
    }
  }

  return {
    persons: [...persons],
    roles: [...roles.values()],
    characters: [...characters.values()],
  }
}
