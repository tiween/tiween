import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Info,
  Ticket,
} from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Alert, AlertDescription, AlertTitle } from "./alert"

const meta: Meta<typeof Alert> = {
  title: "UI/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Alert component for displaying important messages. Supports default, destructive, and warning variants with optional icons.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "warning"],
      description: "Visual variant",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        Ceci est un message d'information pour l'utilisateur.
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>
        Une erreur est survenue lors du traitement de votre demande.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Destructive variant for error messages.",
      },
    },
  },
}

export const Warning: Story = {
  render: () => (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Attention</AlertTitle>
      <AlertDescription>
        Les places sont limitées, réservez rapidement !
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Warning variant for cautionary messages.",
      },
    },
  },
}

export const Success: Story = {
  render: () => (
    <Alert className="border-emerald-500/50 text-emerald-500 [&>svg]:text-emerald-500">
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>Succès</AlertTitle>
      <AlertDescription>
        Votre réservation a été confirmée avec succès !
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Custom success variant using Tailwind classes.",
      },
    },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>Message par défaut.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Destructive</AlertTitle>
        <AlertDescription>Message d'erreur.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Message d'avertissement.</AlertDescription>
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All three variants displayed together.",
      },
    },
  },
}

export const TicketAlert: Story = {
  render: () => (
    <Alert>
      <Ticket className="h-4 w-4" />
      <AlertTitle>Billet en attente</AlertTitle>
      <AlertDescription>
        Votre billet sera disponible 24h avant l'événement. Un email vous sera
        envoyé avec le QR code.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert for ticket status information.",
      },
    },
  },
}

export const EventReminder: Story = {
  render: () => (
    <Alert variant="warning">
      <Calendar className="h-4 w-4" />
      <AlertTitle>Rappel</AlertTitle>
      <AlertDescription>
        L'événement "Concert Jazz Night" commence dans 2 heures. N'oubliez pas
        votre billet !
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert as event reminder notification.",
      },
    },
  },
}

export const PaymentError: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Paiement refusé</AlertTitle>
      <AlertDescription>
        Votre carte a été refusée. Veuillez vérifier les informations ou
        utiliser un autre moyen de paiement.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert for payment failure.",
      },
    },
  },
}

export const SoldOut: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Complet</AlertTitle>
      <AlertDescription>
        Cet événement affiche complet. Inscrivez-vous à la liste d'attente pour
        être notifié en cas de désistement.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert for sold-out events.",
      },
    },
  },
}

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Note importante</AlertTitle>
      <AlertDescription>
        Les portes ouvrent 30 minutes avant le début de l'événement.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert without leading icon.",
      },
    },
  },
}

export const WithoutTitle: Story = {
  render: () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        Pensez à présenter votre QR code à l'entrée.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert with only description, no title.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>معلومات</AlertTitle>
        <AlertDescription>
          سيتم إرسال تذكرتك عبر البريد الإلكتروني قبل 24 ساعة من الحدث.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>حدث خطأ أثناء معالجة طلبك.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>تنبيه</AlertTitle>
        <AlertDescription>الأماكن محدودة، احجز بسرعة!</AlertDescription>
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alerts in RTL mode with Arabic content.",
      },
    },
  },
}
