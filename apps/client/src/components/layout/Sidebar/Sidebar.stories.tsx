import { Calendar, Film, MapPin, Music, Theater } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { Sidebar } from "./Sidebar"

const meta: Meta<typeof Sidebar> = {
  title: "Layout/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Sidebar component for secondary content like filters, navigation, or booking info. Designed for use within TwoColumnLayout or as a standalone panel. Supports sticky positioning on desktop.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Optional title shown at top of sidebar",
    },
    sticky: {
      control: "boolean",
      description: "Makes sidebar sticky on desktop scroll",
    },
    bordered: {
      control: "boolean",
      description: "Adds border around the sidebar",
    },
    filled: {
      control: "boolean",
      description: "Adds background color",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: "Filtres",
    children: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Contenu de la sidebar. Peut inclure des filtres, de la navigation, ou
          des informations.
        </p>
      </div>
    ),
  },
}

export const FilterSidebar: Story = {
  render: () => (
    <Sidebar title="Filtrer" bordered>
      <div className="space-y-6">
        {/* Categories */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Catégories</h3>
          <div className="space-y-2">
            {[
              { id: "music", label: "Musique", icon: Music, count: 15 },
              { id: "cinema", label: "Cinéma", icon: Film, count: 12 },
              { id: "theatre", label: "Théâtre", icon: Theater, count: 8 },
            ].map(({ id, label, icon: Icon, count }) => (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id={id} />
                  <Label
                    htmlFor={id}
                    className="flex items-center gap-2 font-normal"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                </div>
                <span className="text-muted-foreground text-xs">({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Date</h3>
          <div className="space-y-2">
            {["Aujourd'hui", "Cette semaine", "Ce mois"].map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox id={option.toLowerCase().replace(/\s/g, "-")} />
                <Label
                  htmlFor={option.toLowerCase().replace(/\s/g, "-")}
                  className="font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full">Appliquer</Button>
      </div>
    </Sidebar>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sidebar configured as an event filter panel with checkboxes.",
      },
    },
  },
}

export const EventDetails: Story = {
  render: () => (
    <Sidebar bordered filled>
      <div className="space-y-4">
        {/* Event info */}
        <div>
          <h2 className="text-lg font-semibold">Concert Jazz Night</h2>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
            <MapPin className="h-4 w-4" />
            Jazz Club Tunis
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4" />
            15 Février 2025, 20h00
          </div>
        </div>

        {/* Price */}
        <div className="border-border border-t pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">À partir de</span>
            <span className="text-primary text-2xl font-bold">25 TND</span>
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full" size="lg">
          Réserver maintenant
        </Button>

        {/* Quick info */}
        <div className="text-muted-foreground flex justify-center gap-4 text-xs">
          <span>🎫 150 places restantes</span>
        </div>
      </div>
    </Sidebar>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sidebar as event booking panel with pricing and CTA.",
      },
    },
  },
}

export const Navigation: Story = {
  render: () => (
    <Sidebar>
      <nav className="space-y-1">
        {[
          { label: "Mon profil", href: "#", active: false },
          { label: "Mes billets", href: "#", active: true, badge: 3 },
          { label: "Favoris", href: "#", active: false },
          { label: "Paramètres", href: "#", active: false },
          { label: "Aide", href: "#", active: false },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              item.active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {item.label}
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </a>
        ))}
      </nav>
    </Sidebar>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sidebar as vertical navigation with active state and badges.",
      },
    },
  },
}

export const TicketSummary: Story = {
  render: () => (
    <Sidebar title="Résumé" bordered>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">2× Standard</span>
            <span>50 TND</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">1× VIP</span>
            <span>75 TND</span>
          </div>
        </div>

        <div className="border-border border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span>125 TND</span>
          </div>
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

        <Button className="w-full">Payer maintenant</Button>
      </div>
    </Sidebar>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sidebar as order summary for checkout flow.",
      },
    },
  },
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mb-2 text-xs">Default</p>
        <Sidebar title="Default">
          <p className="text-muted-foreground text-sm">No border or fill</p>
        </Sidebar>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">Bordered</p>
        <Sidebar title="Bordered" bordered>
          <p className="text-muted-foreground text-sm">With border</p>
        </Sidebar>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">Filled</p>
        <Sidebar title="Filled" filled>
          <p className="text-muted-foreground text-sm">With background</p>
        </Sidebar>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">Bordered + Filled</p>
        <Sidebar title="Both" bordered filled>
          <p className="text-muted-foreground text-sm">Border and background</p>
        </Sidebar>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "All sidebar visual variants: default, bordered, filled, and combined.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <Sidebar title="الفلاتر" bordered>
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">الفئات</h3>
            <div className="space-y-2">
              {[
                { id: "music-ar", label: "موسيقى" },
                { id: "cinema-ar", label: "سينما" },
                { id: "theatre-ar", label: "مسرح" },
              ].map(({ id, label }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox id={id} />
                  <Label htmlFor={id} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <Button className="w-full">تطبيق</Button>
        </div>
      </Sidebar>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sidebar in RTL mode with Arabic content.",
      },
    },
  },
}
