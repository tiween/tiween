"use client"

import * as React from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Checkbox } from "./checkbox"
import { Label } from "./label"

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Checkbox component for boolean selections. Built on Radix UI Checkbox with accessible keyboard interaction and indeterminate state support.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
      description: "Checked state",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked" className="text-muted-foreground">
          Non coché désactivé
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled checked />
        <Label htmlFor="disabled-checked" className="text-muted-foreground">
          Coché désactivé
        </Label>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Disabled checkboxes in both checked and unchecked states.",
      },
    },
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">
        J&apos;accepte les conditions d&apos;utilisation
      </Label>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Checkbox with associated label for terms acceptance.",
      },
    },
  },
}

export const WithDescription: Story = {
  render: () => (
    <div className="items-top flex space-x-2">
      <Checkbox id="newsletter" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="newsletter" className="text-sm font-medium">
          S&apos;abonner à la newsletter
        </Label>
        <p className="text-muted-foreground text-sm">
          Recevez les dernières actualités et offres par email.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Checkbox with label and description text.",
      },
    },
  },
}

export const TicketOptions: Story = {
  render: function TicketOptionsCheckbox() {
    const [options, setOptions] = React.useState({
      insurance: false,
      parking: false,
      vip: false,
    })

    const handleChange = (key: keyof typeof options) => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    return (
      <div className="space-y-4">
        <p className="text-foreground font-medium">Options supplémentaires</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insurance"
                checked={options.insurance}
                onCheckedChange={() => handleChange("insurance")}
              />
              <Label htmlFor="insurance" className="font-normal">
                Assurance annulation
              </Label>
            </div>
            <span className="text-muted-foreground text-sm">+5 TND</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parking"
                checked={options.parking}
                onCheckedChange={() => handleChange("parking")}
              />
              <Label htmlFor="parking" className="font-normal">
                Place de parking réservée
              </Label>
            </div>
            <span className="text-muted-foreground text-sm">+10 TND</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vip"
                checked={options.vip}
                onCheckedChange={() => handleChange("vip")}
              />
              <Label htmlFor="vip" className="font-normal">
                Accès VIP lounge
              </Label>
            </div>
            <span className="text-muted-foreground text-sm">+25 TND</span>
          </div>
        </div>
      </div>
    )
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Checkboxes for selecting ticket add-ons with pricing.",
      },
    },
  },
}

export const FilterCategories: Story = {
  render: function FilterCategoriesCheckbox() {
    const [categories, setCategories] = React.useState({
      music: true,
      cinema: true,
      theatre: false,
      festival: false,
      expo: false,
    })

    const handleChange = (key: keyof typeof categories) => {
      setCategories((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    return (
      <div className="space-y-4">
        <p className="text-foreground font-medium">Filtrer par catégorie</p>
        <div className="space-y-2">
          {[
            { key: "music" as const, label: "Musique", count: 15 },
            { key: "cinema" as const, label: "Cinéma", count: 12 },
            { key: "theatre" as const, label: "Théâtre", count: 8 },
            { key: "festival" as const, label: "Festivals", count: 5 },
            { key: "expo" as const, label: "Expositions", count: 7 },
          ].map(({ key, label, count }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={categories[key]}
                  onCheckedChange={() => handleChange(key)}
                />
                <Label htmlFor={key} className="font-normal">
                  {label}
                </Label>
              </div>
              <span className="text-muted-foreground text-xs">({count})</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
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
        story: "Checkbox list for filtering by category with item counts.",
      },
    },
  },
}

export const SelectAll: Story = {
  render: function SelectAllCheckbox() {
    const [items, setItems] = React.useState([
      { id: 1, label: "Concert Jazz Night", checked: true },
      { id: 2, label: "Festival du Cinéma", checked: true },
      { id: 3, label: "Pièce de Théâtre", checked: false },
    ])

    const allChecked = items.every((item) => item.checked)
    const someChecked = items.some((item) => item.checked)
    const indeterminate = someChecked && !allChecked

    const handleSelectAll = () => {
      setItems((prev) =>
        prev.map((item) => ({ ...item, checked: !allChecked }))
      )
    }

    const handleItemChange = (id: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      )
    }

    return (
      <div className="space-y-4">
        <div className="border-border flex items-center space-x-2 border-b pb-3">
          <Checkbox
            id="select-all"
            checked={indeterminate ? "indeterminate" : allChecked}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="font-medium">
            Sélectionner tout
          </Label>
        </div>
        <div className="space-y-2 pl-6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={`item-${item.id}`}
                checked={item.checked}
                onCheckedChange={() => handleItemChange(item.id)}
              />
              <Label htmlFor={`item-${item.id}`} className="font-normal">
                {item.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    )
  },
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
        story: "Select all pattern with indeterminate state.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic space-y-4">
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox id="terms-ar" />
        <Label htmlFor="terms-ar">أوافق على شروط الاستخدام</Label>
      </div>
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox id="newsletter-ar" />
        <Label htmlFor="newsletter-ar">الاشتراك في النشرة الإخبارية</Label>
      </div>
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox id="notifications-ar" defaultChecked />
        <Label htmlFor="notifications-ar">تفعيل الإشعارات</Label>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Checkboxes in RTL mode with Arabic content.",
      },
    },
  },
}
