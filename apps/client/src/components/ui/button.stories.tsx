import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "./button"

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: {
      control: "boolean",
    },
    isLoading: {
      control: "boolean",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: "Acheter",
    variant: "default",
  },
}

export const Secondary: Story = {
  args: {
    children: "Annuler",
    variant: "secondary",
  },
}

export const Destructive: Story = {
  args: {
    children: "Supprimer",
    variant: "destructive",
  },
}

export const Outline: Story = {
  args: {
    children: "Voir plus",
    variant: "outline",
  },
}

export const Ghost: Story = {
  args: {
    children: "Passer",
    variant: "ghost",
  },
}

export const Link: Story = {
  args: {
    children: "En savoir plus",
    variant: "link",
  },
}

export const Small: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
}

export const Large: Story = {
  args: {
    children: "Confirmer",
    size: "lg",
  },
}

export const Icon: Story = {
  args: {
    children: "🎫",
    size: "icon",
  },
}

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    children: "Loading",
    isLoading: true,
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🎫</Button>
    </div>
  ),
}
