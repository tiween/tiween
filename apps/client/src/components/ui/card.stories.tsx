import { Calendar, MapPin, Ticket } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Button } from "./button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card component for displaying content in a contained, elevated surface. Composed of Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter sub-components.",
      },
    },
  },
  tags: ["autodocs"],
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
    <Card>
      <CardHeader>
        <CardTitle>Titre de la carte</CardTitle>
        <CardDescription>
          Description de la carte avec informations supplémentaires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Contenu principal de la carte. Peut inclure du texte, des images, ou
          d&apos;autres composants.
        </p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const EventCard: Story = {
  render: () => (
    <Card className="overflow-hidden">
      <div className="bg-primary/10 relative aspect-video w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">
            Image de l&apos;événement
          </span>
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Concert Jazz Night</CardTitle>
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            Musique
          </span>
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Jazz Club Tunis
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            15 Fév 2025
          </span>
          <span className="flex items-center gap-1">
            <Ticket className="h-4 w-4" />À partir de 25 TND
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button className="w-full">Réserver</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card styled as an event listing with image, metadata, and CTA.",
      },
    },
  },
}

export const PricingCard: Story = {
  render: () => (
    <Card className="border-primary relative overflow-hidden">
      <div className="bg-primary text-primary-foreground absolute top-0 right-0 px-3 py-1 text-xs font-medium">
        Populaire
      </div>
      <CardHeader>
        <CardTitle>Pass VIP</CardTitle>
        <CardDescription>
          Accès complet avec avantages exclusifs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-4xl font-bold">150</span>
          <span className="text-muted-foreground text-sm"> TND</span>
        </div>
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Accès aux coulisses
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Place réservée au premier
            rang
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Rencontre avec les artistes
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Boissons offertes
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Choisir ce pass</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card designed for pricing tiers with feature list.",
      },
    },
  },
}

export const TicketSummary: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Résumé de la commande</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">2x Billet Standard</span>
          <span>50 TND</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">1x Billet VIP</span>
          <span>75 TND</span>
        </div>
        <div className="border-border border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de service</span>
            <span>5 TND</span>
          </div>
        </div>
        <div className="border-border border-t pt-4">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">130 TND</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Procéder au paiement</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card as an order summary showing line items and total.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <Card>
        <CardHeader>
          <CardTitle>حفلة موسيقية</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            قاعة الحمامات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              15 فيفري 2025
            </span>
            <span className="flex items-center gap-1">
              <Ticket className="h-4 w-4" />
              ابتداءً من 25 دينار
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">حجز التذاكر</Button>
        </CardFooter>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card in RTL mode with Arabic content.",
      },
    },
  },
}

export const Minimal: Story = {
  render: () => (
    <Card className="p-4">
      <p className="text-sm">
        A minimal card without header or footer - just content wrapped in a
        styled container.
      </p>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Minimal card usage without sub-components.",
      },
    },
  },
}

export const Interactive: Story = {
  render: () => (
    <Card className="cursor-pointer transition-shadow hover:shadow-lg">
      <CardHeader>
        <CardTitle>Carte interactive</CardTitle>
        <CardDescription>
          Survol pour voir l&apos;effet de shadow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Cette carte a un effet hover pour indiquer qu&apos;elle est cliquable.
        </p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card with hover effect for interactive/clickable contexts.",
      },
    },
  },
}
