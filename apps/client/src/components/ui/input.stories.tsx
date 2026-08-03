import * as React from "react"
import { Eye, EyeOff, Lock, Mail, Phone, Search } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Input } from "./input"
import { Label } from "./label"

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Input component for text entry. Supports all standard HTML input attributes including type, placeholder, and disabled state.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "search", "url"],
      description: "HTML input type",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
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
    placeholder: "Entrez votre texte...",
    type: "text",
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Adresse email</Label>
      <Input id="email" type="email" placeholder="nom@exemple.com" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Input paired with a Label component for form fields.",
      },
    },
  },
}

export const WithIcon: Story = {
  render: () => (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input className="pl-10" placeholder="Rechercher..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Input with a leading icon for visual context.",
      },
    },
  },
}

export const Password: Story = {
  render: function PasswordInput() {
    const [showPassword, setShowPassword] = React.useState(false)
    return (
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className="pr-10 pl-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Password input with show/hide toggle functionality.",
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    placeholder: "Non modifiable",
    disabled: true,
    value: "Valeur désactivée",
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled input shows reduced opacity and prevents interaction.",
      },
    },
  },
}

export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="error-email">Email</Label>
      <Input
        id="error-email"
        type="email"
        placeholder="nom@exemple.com"
        className="border-destructive focus-visible:ring-destructive"
        defaultValue="invalid-email"
        aria-invalid="true"
        aria-describedby="email-error"
      />
      <p id="email-error" className="text-destructive text-sm">
        Veuillez entrer une adresse email valide.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Input in error state with validation message.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic space-y-2">
      <Label htmlFor="arabic-input">البريد الإلكتروني</Label>
      <div className="relative">
        <Mail className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
        <Input
          id="arabic-input"
          type="email"
          className="pr-10"
          placeholder="أدخل بريدك الإلكتروني"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Input in RTL mode with Arabic content. Note icon position adjustment.",
      },
    },
  },
}

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Text</Label>
        <Input type="text" placeholder="Texte" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="email@exemple.com" />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" placeholder="••••••••" />
      </div>
      <div className="space-y-2">
        <Label>Number</Label>
        <Input type="number" placeholder="0" min={0} max={100} />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <div className="relative">
          <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input type="tel" className="pl-10" placeholder="+216 XX XXX XXX" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input type="search" className="pl-10" placeholder="Rechercher..." />
        </div>
      </div>
    </div>
  ),
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
        story: "Showcase of all common input types with appropriate styling.",
      },
    },
  },
}
