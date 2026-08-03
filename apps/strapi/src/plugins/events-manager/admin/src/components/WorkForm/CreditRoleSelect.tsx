/**
 * CreditRoleSelect
 *
 * Single select over the plugin::creative-works.credit-role records.
 * `credit.creditRole` is a required relation, so the value carried around is
 * the record reference (keyed by documentId), not an enum string.
 *
 * The vocabulary is fetched ONCE by the parent editor and passed in — this
 * component renders a single row, so fetching here would issue one identical
 * full-vocabulary request per credit row.
 */

import { SingleSelect, SingleSelectOption } from "@strapi/design-system"

import type { CreditRoleRef } from "../../hooks/useCreativeWorks"

interface CreditRoleSelectProps {
  value: CreditRoleRef | null
  creditRoles: CreditRoleRef[]
  placeholder: string
  isLoading?: boolean
  onChange: (creditRole: CreditRoleRef | null) => void
  hasError?: boolean
  disabled?: boolean
}

export function CreditRoleSelect({
  value,
  creditRoles,
  placeholder,
  isLoading,
  onChange,
  hasError,
  disabled,
}: CreditRoleSelectProps) {
  // Keep the persisted role visible even before the list resolves
  const options =
    value && !creditRoles.some((role) => role.documentId === value.documentId)
      ? [value, ...creditRoles]
      : creditRoles

  return (
    <SingleSelect
      placeholder={placeholder}
      hasError={hasError}
      // SingleSelect has no loading affordance; keep it inert until the
      // vocabulary resolves so a pick cannot land on a stale list. An empty
      // list stays inert too — an enabled select with nothing to pick reads as
      // a broken control rather than as missing data (the editor renders an
      // explicit warning in that case).
      disabled={disabled || isLoading || options.length === 0}
      value={value?.documentId ?? ""}
      onChange={(documentId: string | number) => {
        const role = options.find(
          (option) => option.documentId === String(documentId)
        )
        // Ignore an unresolvable selection rather than silently clearing a
        // required relation the user did not intend to change.
        if (role) {
          onChange(role)
        }
      }}
    >
      {options.map((role) => (
        <SingleSelectOption key={role.documentId} value={role.documentId}>
          {role.name}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  )
}
