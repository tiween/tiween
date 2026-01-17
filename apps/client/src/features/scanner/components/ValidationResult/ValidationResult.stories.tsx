import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { ValidationStatus } from "./ValidationResult"

import { ValidationResult } from "./ValidationResult"

const meta: Meta<typeof ValidationResult> = {
  title: "Features/Scanner/ValidationResult",
  component: ValidationResult,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-screen validation result overlay for ticket scanning. High contrast design for dark venues with color-coded status feedback.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ValidationResult>

const sampleTicketDetails = {
  ticketId: "TIW-2024-1234",
  eventTitle: "Les Misérables - Le Concert",
  quantity: 2,
  holderName: "Ahmed Ben Ali",
}

/**
 * Valid ticket - Green success screen
 */
export const Valid: Story = {
  args: {
    status: "valid",
    ticketDetails: sampleTicketDetails,
    autoDismissMs: 0, // Disable auto-dismiss for Storybook
    onDismiss: () => console.log("Dismissed"),
  },
}

/**
 * Already scanned - Red error with timestamp
 */
export const AlreadyScanned: Story = {
  args: {
    status: "already-scanned",
    scannedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    autoDismissMs: 0,
    onDismiss: () => console.log("Dismissed"),
  },
}

/**
 * Not found - Red error
 */
export const NotFound: Story = {
  args: {
    status: "not-found",
    autoDismissMs: 0,
    onDismiss: () => console.log("Dismissed"),
  },
}

/**
 * Wrong event - Yellow warning
 */
export const WrongEvent: Story = {
  args: {
    status: "wrong-event",
    autoDismissMs: 0,
    onDismiss: () => console.log("Dismissed"),
  },
}

/**
 * Auto-dismiss demo (2 seconds)
 */
export const AutoDismiss: Story = {
  render: () => {
    const [showResult, setShowResult] = useState(true)

    if (!showResult) {
      return (
        <div className="flex h-screen items-center justify-center">
          <button
            onClick={() => setShowResult(true)}
            className="bg-primary text-primary-foreground rounded px-4 py-2"
          >
            Show Result Again
          </button>
        </div>
      )
    }

    return (
      <ValidationResult
        status="valid"
        ticketDetails={sampleTicketDetails}
        autoDismissMs={2000}
        onDismiss={() => setShowResult(false)}
      />
    )
  },
}

/**
 * Arabic labels
 */
export const ArabicLabels: Story = {
  args: {
    status: "valid",
    ticketDetails: {
      ...sampleTicketDetails,
      holderName: "أحمد بن علي",
      eventTitle: "البؤساء - الحفل",
    },
    autoDismissMs: 0,
    labels: {
      valid: "صالح",
      alreadyScanned: "تم مسحه مسبقاً",
      notFound: "غير موجود",
      wrongEvent: "حدث خاطئ",
      ticketId: "التذكرة",
      quantity: "عدد الدخول",
      scannedAt: "تم المسح في",
      holder: "صاحب التذكرة",
    },
  },
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  args: {
    status: "already-scanned",
    scannedAt: new Date(),
    autoDismissMs: 0,
    labels: {
      valid: "Valid",
      alreadyScanned: "Already Scanned",
      notFound: "Not Found",
      wrongEvent: "Wrong Event",
      ticketId: "Ticket",
      quantity: "Entries",
      scannedAt: "Scanned at",
      holder: "Holder",
    },
  },
}

/**
 * All states showcase
 */
export const AllStates: Story = {
  render: () => {
    const [currentStatus, setCurrentStatus] =
      useState<ValidationStatus>("valid")

    const statuses: ValidationStatus[] = [
      "valid",
      "already-scanned",
      "not-found",
      "wrong-event",
    ]

    const currentIndex = statuses.indexOf(currentStatus)
    const nextStatus = statuses[(currentIndex + 1) % statuses.length]

    return (
      <>
        <ValidationResult
          status={currentStatus}
          ticketDetails={
            currentStatus === "valid" ? sampleTicketDetails : undefined
          }
          scannedAt={
            currentStatus === "already-scanned"
              ? new Date(Date.now() - 3 * 60 * 1000)
              : undefined
          }
          autoDismissMs={1500}
          onDismiss={() => setCurrentStatus(nextStatus)}
        />
      </>
    )
  },
}

/**
 * Valid without holder name
 */
export const ValidNoHolder: Story = {
  args: {
    status: "valid",
    ticketDetails: {
      ticketId: "TIW-2024-5678",
      eventTitle: "Festival de Jazz de Tabarka",
      quantity: 4,
    },
    autoDismissMs: 0,
  },
}

/**
 * Single ticket
 */
export const SingleTicket: Story = {
  args: {
    status: "valid",
    ticketDetails: {
      ticketId: "TIW-2024-9999",
      eventTitle: "Cinéma - Oppenheimer",
      quantity: 1,
      holderName: "Fatma Bouazizi",
    },
    autoDismissMs: 0,
  },
}
