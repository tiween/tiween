import { useState } from "react"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Button } from "./button"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"
import { Toaster } from "./toaster"
import { toast as toastFn, useToast } from "./use-toast"

const meta: Meta<typeof Toast> = {
  title: "UI/Toast",
  component: Toast,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Toast notifications for displaying brief messages to users. Supports success, info, warning, and error variants with semantic colors.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "success", "info", "warning", "destructive"],
      description: "Visual variant with semantic colors",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Static toast examples for visual reference
export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast className="relative" open>
        <div className="grid gap-1">
          <ToastTitle>Notification</ToastTitle>
          <ToastDescription>
            This is a default toast notification.
          </ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const Success: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="success" className="relative" open>
        <div className="flex gap-3">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div className="grid gap-1">
            <ToastTitle>Succès!</ToastTitle>
            <ToastDescription>
              Votre billet a été acheté avec succès.
            </ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Success variant with green accent. Use for successful operations like purchases, saves, etc.",
      },
    },
  },
}

export const InfoVariant: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="info" className="relative" open>
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0" />
          <div className="grid gap-1">
            <ToastTitle>Information</ToastTitle>
            <ToastDescription>
              Nouvel événement ajouté à votre région.
            </ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Info variant with blue accent. Use for informational messages and updates.",
      },
    },
  },
}

export const Warning: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="warning" className="relative" open>
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="grid gap-1">
            <ToastTitle>Attention</ToastTitle>
            <ToastDescription>
              Il ne reste que 5 billets disponibles.
            </ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Warning variant with yellow accent. Use for warnings that need attention.",
      },
    },
  },
}

export const Destructive: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="destructive" className="relative" open>
        <div className="flex gap-3">
          <XCircle className="h-5 w-5 shrink-0" />
          <div className="grid gap-1">
            <ToastTitle>Erreur</ToastTitle>
            <ToastDescription>
              Le paiement a échoué. Veuillez réessayer.
            </ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Destructive variant with red accent. Use for errors and failed operations.",
      },
    },
  },
}

export const WithAction: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="default" className="relative" open>
        <div className="grid gap-1">
          <ToastTitle>Événement ajouté</ToastTitle>
          <ToastDescription>
            L&apos;événement a été ajouté à votre watchlist.
          </ToastDescription>
        </div>
        <ToastAction altText="Annuler">Annuler</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: "Toast with an action button for undo or follow-up actions.",
      },
    },
  },
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <ToastProvider>
        <Toast variant="default" className="relative" open>
          <div className="grid gap-1">
            <ToastTitle>Default</ToastTitle>
            <ToastDescription>Standard notification message.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>

      <ToastProvider>
        <Toast variant="success" className="relative" open>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Operation completed successfully.
              </ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>

      <ToastProvider>
        <Toast variant="info" className="relative" open>
          <div className="flex gap-3">
            <Info className="h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <ToastTitle>Info</ToastTitle>
              <ToastDescription>Here is some information.</ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>

      <ToastProvider>
        <Toast variant="warning" className="relative" open>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <ToastTitle>Warning</ToastTitle>
              <ToastDescription>Please be aware of this.</ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>

      <ToastProvider>
        <Toast variant="destructive" className="relative" open>
          <div className="flex gap-3">
            <XCircle className="h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Something went wrong.</ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All toast variants displayed for visual comparison.",
      },
    },
  },
}

// Interactive demo with useToast hook
export const InteractiveDemo: Story = {
  render: function ToastDemo() {
    const { toast } = useToast()

    const showToast = (
      variant: "default" | "success" | "info" | "warning" | "destructive"
    ) => {
      const messages = {
        default: {
          title: "Notification",
          description: "This is a default toast message.",
        },
        success: {
          title: "Succès!",
          description: "Votre action a été effectuée avec succès.",
        },
        info: {
          title: "Information",
          description: "Voici une information importante.",
        },
        warning: {
          title: "Attention",
          description: "Veuillez vérifier cette information.",
        },
        destructive: {
          title: "Erreur",
          description: "Une erreur est survenue. Veuillez réessayer.",
        },
      }

      toast({
        variant,
        title: messages[variant].title,
        description: messages[variant].description,
      })
    }

    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Click a button to show a toast notification:
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => showToast("default")}>
            Default
          </Button>
          <Button
            variant="outline"
            className="text-green-600"
            onClick={() => showToast("success")}
          >
            Success
          </Button>
          <Button
            variant="outline"
            className="text-blue-600"
            onClick={() => showToast("info")}
          >
            Info
          </Button>
          <Button
            variant="outline"
            className="text-yellow-600"
            onClick={() => showToast("warning")}
          >
            Warning
          </Button>
          <Button
            variant="destructive"
            onClick={() => showToast("destructive")}
          >
            Error
          </Button>
        </div>
        <Toaster />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demo using the useToast hook. Click buttons to trigger different toast variants.",
      },
    },
  },
}

// RTL Mode
export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <ToastProvider>
        <Toast variant="success" className="relative" open>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <ToastTitle>نجاح!</ToastTitle>
              <ToastDescription>تم شراء تذكرتك بنجاح.</ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Toast in RTL mode with Arabic text.",
      },
    },
  },
}
