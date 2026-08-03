"use client"

import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Button } from "./button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { Input } from "./input"
import { Label } from "./label"

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dialog component for modal interactions. Built on Radix UI Dialog primitive with accessible keyboard navigation and focus management.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Ouvrir le dialogue</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titre du dialogue</DialogTitle>
          <DialogDescription>
            Ceci est une description du dialogue. Elle fournit un contexte
            supplémentaire pour l&apos;utilisateur.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            Contenu principal du dialogue. Vous pouvez inclure n&apos;importe
            quel contenu ici.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button>Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const DeleteConfirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer le billet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            Confirmer la suppression
          </DialogTitle>
          <DialogDescription className="text-center">
            Êtes-vous sûr de vouloir supprimer ce billet ? Cette action est
            irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button variant="destructive">Supprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: "Confirmation dialog for destructive actions with warning icon.",
      },
    },
  },
}

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Modifier le profil</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez vos informations personnelles ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              placeholder="Votre nom"
              defaultValue="Ahmed Ben Ali"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemple.com"
              defaultValue="ahmed@exemple.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" placeholder="+216 XX XXX XXX" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: "Dialog containing a form for user input.",
      },
    },
  },
}

export const TicketDetails: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Voir les détails du billet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails du billet</DialogTitle>
          <DialogDescription>
            Concert Jazz Night - Jazz Club Tunis
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Date</p>
              <p className="font-medium">15 Février 2025</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Heure</p>
              <p className="font-medium">20h00</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Place</p>
              <p className="font-medium">Rangée A, Siège 15</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Type</p>
              <p className="font-medium">VIP</p>
            </div>
          </div>
          <div className="bg-primary/5 flex items-center justify-center rounded-lg p-8">
            <div className="text-center">
              <div className="mx-auto mb-2 h-24 w-24 rounded-lg bg-white p-2">
                <div className="bg-foreground h-full w-full rounded" />
              </div>
              <p className="text-muted-foreground text-xs">Code QR du billet</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="w-full sm:w-auto">
            Télécharger le PDF
          </Button>
          <Button className="w-full sm:w-auto">Partager</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: "Dialog displaying detailed ticket information with QR code.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">فتح الحوار</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحجز</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في تأكيد هذا الحجز؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-medium">حفلة موسيقية - قاعة الحمامات</p>
              <p className="text-muted-foreground text-sm">
                15 فيفري 2025 - 20:00
              </p>
              <p className="text-primary mt-2 font-semibold">150 دينار</p>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button>تأكيد</Button>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Dialog in RTL mode with Arabic content. Note the reversed footer buttons.",
      },
    },
  },
}

export const ControlledDialog: Story = {
  render: function ControlledDialogStory() {
    const [open, setOpen] = React.useState(false)
    const [step, setStep] = React.useState(1)

    const handleNext = () => {
      if (step < 3) {
        setStep(step + 1)
      } else {
        setOpen(false)
        setStep(1)
      }
    }

    const handleBack = () => {
      if (step > 1) {
        setStep(step - 1)
      }
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Démarrer le processus</Button>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) setStep(1)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Étape {step} sur 3</DialogTitle>
              <DialogDescription>
                {step === 1 && "Sélectionnez vos places"}
                {step === 2 && "Vérifiez votre commande"}
                {step === 3 && "Procédez au paiement"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-8">
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      s <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground mt-4 text-center text-sm">
                Contenu de l&apos;étape {step}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Précédent
              </Button>
              <Button onClick={handleNext}>
                {step === 3 ? "Terminer" : "Suivant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Controlled dialog with multi-step wizard functionality.",
      },
    },
  },
}
