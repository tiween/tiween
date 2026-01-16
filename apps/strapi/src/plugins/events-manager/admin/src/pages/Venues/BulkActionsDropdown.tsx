/**
 * BulkActionsDropdown Component
 *
 * Dropdown menu for bulk venue actions (approve, suspend, delete).
 */

import { Button, Menu } from "@strapi/design-system"
import { Check, Cross, More, Trash } from "@strapi/icons"

interface BulkActionsDropdownProps {
  selectedCount: number
  onApprove: () => void
  onSuspend: () => void
  onDelete: () => void
}

export function BulkActionsDropdown({
  selectedCount,
  onApprove,
  onSuspend,
  onDelete,
}: BulkActionsDropdownProps) {
  return (
    <Menu.Root>
      <Menu.Trigger>
        <Button variant="tertiary" endIcon={<More />}>
          Actions ({selectedCount})
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onSelect={onApprove}>
          <Check />
          Approuver
        </Menu.Item>
        <Menu.Item onSelect={onSuspend}>
          <Cross />
          Suspendre
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={onDelete} color="danger600">
          <Trash />
          Supprimer
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  )
}
