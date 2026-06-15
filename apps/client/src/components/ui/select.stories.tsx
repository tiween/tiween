"use client"

import * as React from "react"
import { Calendar, Film, Globe, MapPin, Music, Theater } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Label } from "./label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Select component for choosing from a list of options. Built on Radix UI Select with keyboard navigation and accessibility support.",
      },
    },
  },
  tags: ["autodocs"],
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
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="category">Catégorie</Label>
      <Select>
        <SelectTrigger id="category">
          <SelectValue placeholder="Choisir une catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="music">
            <span className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Musique
            </span>
          </SelectItem>
          <SelectItem value="cinema">
            <span className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              Cinéma
            </span>
          </SelectItem>
          <SelectItem value="theatre">
            <span className="flex items-center gap-2">
              <Theater className="h-4 w-4" />
              Théâtre
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Select with label and icons in options.",
      },
    },
  },
}

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une ville" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Grand Tunis</SelectLabel>
          <SelectItem value="tunis">Tunis</SelectItem>
          <SelectItem value="ariana">Ariana</SelectItem>
          <SelectItem value="ben-arous">Ben Arous</SelectItem>
          <SelectItem value="manouba">Manouba</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Côte Est</SelectLabel>
          <SelectItem value="sousse">Sousse</SelectItem>
          <SelectItem value="monastir">Monastir</SelectItem>
          <SelectItem value="mahdia">Mahdia</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Nord</SelectLabel>
          <SelectItem value="bizerte">Bizerte</SelectItem>
          <SelectItem value="beja">Béja</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story: "Select with grouped options and separators.",
      },
    },
  },
}

export const Venues: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Lieu de l'événement</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choisir un lieu" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Tunis
            </SelectLabel>
            <SelectItem value="colisee">Le Colisée</SelectItem>
            <SelectItem value="theatre-municipal">Théâtre Municipal</SelectItem>
            <SelectItem value="cite-culture">Cité de la Culture</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Sousse
            </SelectLabel>
            <SelectItem value="palace-sousse">Palace Sousse</SelectItem>
            <SelectItem value="theatre-sousse">Théâtre de Sousse</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Select for venue selection grouped by city.",
      },
    },
  },
}

export const Language: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Langue</Label>
      <Select defaultValue="fr">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Français
            </span>
          </SelectItem>
          <SelectItem value="ar">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              العربية
            </span>
          </SelectItem>
          <SelectItem value="en">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              English
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Language selector with pre-selected value.",
      },
    },
  },
}

export const DateFilter: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Période</Label>
      <Select defaultValue="this-week">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Aujourd'hui
            </span>
          </SelectItem>
          <SelectItem value="tomorrow">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Demain
            </span>
          </SelectItem>
          <SelectItem value="this-week">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cette semaine
            </span>
          </SelectItem>
          <SelectItem value="this-month">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ce mois
            </span>
          </SelectItem>
          <SelectItem value="custom">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Personnalisé
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Date range filter for event filtering.",
      },
    },
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sélection désactivée</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Non disponible" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Options partiellement désactivées</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un billet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard - 25 TND</SelectItem>
            <SelectItem value="vip">VIP - 75 TND</SelectItem>
            <SelectItem value="premium" disabled>
              Premium - Épuisé
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Disabled select and select with disabled options.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic space-y-2">
      <Label>اختر الفئة</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="اختر فئة" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>الفئات</SelectLabel>
            <SelectItem value="music">
              <span className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                موسيقى
              </span>
            </SelectItem>
            <SelectItem value="cinema">
              <span className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                سينما
              </span>
            </SelectItem>
            <SelectItem value="theatre">
              <span className="flex items-center gap-2">
                <Theater className="h-4 w-4" />
                مسرح
              </span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Select in RTL mode with Arabic content.",
      },
    },
  },
}

export const Controlled: Story = {
  render: function ControlledSelect() {
    const [value, setValue] = React.useState("")

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Type de billet</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard - 25 TND</SelectItem>
              <SelectItem value="vip">VIP - 75 TND</SelectItem>
              <SelectItem value="premium">Premium - 150 TND</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground text-sm">
          Valeur sélectionnée: <strong>{value || "Aucune"}</strong>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Controlled select with external state management.",
      },
    },
  },
}
