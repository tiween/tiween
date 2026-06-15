import {
  AlertTriangle,
  Check,
  Film,
  Info,
  Music,
  Star,
  Theater,
  Ticket,
  X,
} from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "./badge"

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Badge component for displaying small labels, tags, or status indicators. Supports four variants: default, secondary, destructive, and outline.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
      description: "Visual variant",
    },
    children: {
      control: "text",
      description: "Badge content",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
}

export const Secondary: Story = {
  args: {
    children: "Secondaire",
    variant: "secondary",
  },
}

export const Destructive: Story = {
  args: {
    children: "Erreur",
    variant: "destructive",
  },
}

export const Outline: Story = {
  args: {
    children: "Contour",
    variant: "outline",
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All badge variants displayed side by side.",
      },
    },
  },
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">
        <Check className="h-3 w-3" />
        Confirmé
      </Badge>
      <Badge variant="destructive">
        <X className="h-3 w-3" />
        Annulé
      </Badge>
      <Badge variant="secondary">
        <AlertTriangle className="h-3 w-3" />
        En attente
      </Badge>
      <Badge variant="outline">
        <Info className="h-3 w-3" />
        Info
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges with leading icons for enhanced visual communication.",
      },
    },
  },
}

export const EventCategories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-purple-500 hover:bg-purple-600">
        <Music className="h-3 w-3" />
        Musique
      </Badge>
      <Badge className="bg-blue-500 hover:bg-blue-600">
        <Film className="h-3 w-3" />
        Cinéma
      </Badge>
      <Badge className="bg-rose-500 hover:bg-rose-600">
        <Theater className="h-3 w-3" />
        Théâtre
      </Badge>
      <Badge className="bg-amber-500 hover:bg-amber-600">
        <Star className="h-3 w-3" />
        Festival
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Custom colored badges for event categories using Tailwind classes.",
      },
    },
  },
}

export const TicketStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" className="bg-emerald-500">
        <Ticket className="h-3 w-3" />
        Validé
      </Badge>
      <Badge variant="secondary">
        <Ticket className="h-3 w-3" />
        Non scanné
      </Badge>
      <Badge variant="destructive">
        <Ticket className="h-3 w-3" />
        Expiré
      </Badge>
      <Badge variant="outline">
        <Ticket className="h-3 w-3" />
        Remboursé
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges representing different ticket validation states.",
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="px-1.5 py-0.5 text-[10px]">XS</Badge>
      <Badge>Default</Badge>
      <Badge className="px-3 py-1 text-sm">Large</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different badge sizes using Tailwind utility classes.",
      },
    },
  },
}

export const AsLink: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge asChild>
        <a href="#cinéma">Cinéma</a>
      </Badge>
      <Badge asChild variant="secondary">
        <a href="#musique">Musique</a>
      </Badge>
      <Badge asChild variant="outline">
        <a href="#théâtre">Théâtre</a>
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges rendered as links using the asChild prop pattern.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic flex flex-wrap gap-2">
      <Badge variant="default">
        <Check className="h-3 w-3" />
        مؤكد
      </Badge>
      <Badge variant="secondary">
        <Star className="h-3 w-3" />
        مميز
      </Badge>
      <Badge variant="destructive">
        <X className="h-3 w-3" />
        ملغى
      </Badge>
      <Badge variant="outline">
        <Info className="h-3 w-3" />
        معلومات
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges in RTL mode with Arabic text.",
      },
    },
  },
}

export const InContext: Story = {
  render: () => (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-foreground font-semibold">Concert Jazz Night</h3>
          <p className="text-muted-foreground text-sm">
            Jazz Club Tunis • 15 Fév 2025
          </p>
        </div>
        <Badge variant="default">
          <Star className="h-3 w-3" />À la une
        </Badge>
      </div>
      <div className="mt-4 flex gap-2">
        <Badge variant="secondary">Musique</Badge>
        <Badge variant="outline">20h00</Badge>
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
          Places disponibles
        </Badge>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Badges used in context within an event card.",
      },
    },
  },
}
