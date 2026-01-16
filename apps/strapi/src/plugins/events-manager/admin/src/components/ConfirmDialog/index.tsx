import { Button, Dialog, Flex, Typography } from "@strapi/design-system"
import { WarningCircle } from "@strapi/icons"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning" | "success"
  isLoading?: boolean
}

/**
 * Confirmation Dialog
 *
 * Reusable dialog for confirming destructive actions.
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content>
        <Dialog.Header>{title}</Dialog.Header>
        <Dialog.Body>
          <Flex direction="column" alignItems="center" gap={4}>
            <WarningCircle
              width={48}
              height={48}
              fill={
                variant === "danger"
                  ? "var(--colors-danger500)"
                  : variant === "success"
                    ? "var(--colors-success500)"
                    : "var(--colors-warning500)"
              }
            />
            <Typography variant="omega" textAlign="center">
              {message}
            </Typography>
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary" onClick={onClose} disabled={isLoading}>
              {cancelLabel}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button
              variant={
                variant === "danger"
                  ? "danger"
                  : variant === "success"
                    ? "success"
                    : "default"
              }
              onClick={onConfirm}
              loading={isLoading}
            >
              {confirmLabel}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export { ConfirmDialog }
