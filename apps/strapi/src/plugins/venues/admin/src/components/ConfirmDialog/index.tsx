/**
 * Destructive-action confirmation (`Dialog.*`, never `Modal.*`).
 *
 * DS v2 splits the two on purpose: `Modal` is a form surface, `Dialog` is a
 * decision. Both the single and the bulk delete in this plugin name their SCOPE
 * in the body ("Supprimer 3 lieux ?"), which is the whole point of the confirm —
 * a generic "Are you sure?" is what lets an editor delete a selection they had
 * forgotten was still active.
 */
import { Button, Dialog, Flex, Typography } from "@strapi/design-system"
import { WarningCircle } from "@strapi/icons"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content>
        <Dialog.Header>{title}</Dialog.Header>
        <Dialog.Body>
          <Flex direction="column" alignItems="center" gap={4}>
            {/*
              `fill` takes a CSS colour, not a DS token prop — `var(--colors-…)`
              is the sanctioned form for a raw SVG fill (DS binding sheet § 0).
            */}
            <WarningCircle
              width={48}
              height={48}
              fill="var(--colors-danger500)"
            />
            <Typography variant="omega" textAlign="center">
              {body}
            </Typography>
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary" disabled={isLoading}>
              {cancelLabel}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button variant="danger" onClick={onConfirm} loading={isLoading}>
              {confirmLabel}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
