import * as React from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Label } from "./label"
import { Textarea } from "./textarea"

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Textarea component for multi-line text input. Features consistent styling with the Input component and disabled resize by default.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    rows: {
      control: "number",
      description: "Number of visible text rows",
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
    placeholder: "Entrez votre message...",
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Écrivez votre message ici..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Textarea with an associated label.",
      },
    },
  },
}

export const WithCharacterCount: Story = {
  render: function CharacterCountTextarea() {
    const [value, setValue] = React.useState("")
    const maxLength = 500

    return (
      <div className="space-y-2">
        <Label htmlFor="bio">Biographie</Label>
        <Textarea
          id="bio"
          placeholder="Parlez-nous de vous..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
        />
        <p
          className={`text-right text-xs ${value.length >= maxLength ? "text-destructive" : "text-muted-foreground"}`}
        >
          {value.length}/{maxLength} caractères
        </p>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Textarea with character count indicator.",
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    placeholder: "Non modifiable",
    disabled: true,
    defaultValue: "Ce texte ne peut pas être modifié.",
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled textarea showing reduced opacity.",
      },
    },
  },
}

export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="error-textarea">Description</Label>
      <Textarea
        id="error-textarea"
        placeholder="Décrivez l'événement..."
        className="border-destructive focus-visible:ring-destructive"
        aria-invalid="true"
        aria-describedby="textarea-error"
      />
      <p id="textarea-error" className="text-destructive text-sm">
        La description est obligatoire.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Textarea in error state with validation message.",
      },
    },
  },
}

export const EventDescription: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="event-description">Description de l&apos;événement</Label>
      <Textarea
        id="event-description"
        placeholder="Décrivez votre événement en détail. Incluez les informations importantes pour les participants..."
        className="min-h-32"
      />
      <p className="text-muted-foreground text-xs">
        Cette description apparaîtra sur la page de l&apos;événement.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Textarea for event description with helper text.",
      },
    },
  },
}

export const ContactForm: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Sujet</Label>
        <Textarea
          id="subject"
          placeholder="Résumez votre demande en une phrase..."
          className="min-h-12"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="details">Détails</Label>
        <Textarea
          id="details"
          placeholder="Décrivez votre problème ou question en détail..."
          className="min-h-32"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple textareas in a contact form context.",
      },
    },
  },
}

export const ReviewForm: Story = {
  render: function ReviewFormTextarea() {
    const [review, setReview] = React.useState("")

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="review">Votre avis</Label>
          <Textarea
            id="review"
            placeholder="Partagez votre expérience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="min-h-24"
          />
        </div>
        <div className="text-muted-foreground text-xs">
          {review.length < 50 && (
            <span>Minimum 50 caractères ({50 - review.length} restants)</span>
          )}
          {review.length >= 50 && (
            <span className="text-emerald-500">
              ✓ Longueur minimale atteinte
            </span>
          )}
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Review textarea with minimum length requirement.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic space-y-2">
      <Label htmlFor="arabic-textarea">رسالتك</Label>
      <Textarea id="arabic-textarea" placeholder="اكتب رسالتك هنا..." />
      <p className="text-muted-foreground text-xs">الحد الأقصى 500 حرف</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Textarea in RTL mode with Arabic content.",
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">
          Small (min-h-16)
        </Label>
        <Textarea placeholder="Petit textarea..." className="min-h-16" />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">
          Default (min-h-24)
        </Label>
        <Textarea placeholder="Textarea par défaut..." className="min-h-24" />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">
          Large (min-h-40)
        </Label>
        <Textarea placeholder="Grand textarea..." className="min-h-40" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different textarea heights using min-height utilities.",
      },
    },
  },
}
