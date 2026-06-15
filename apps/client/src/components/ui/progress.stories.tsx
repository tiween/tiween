"use client"

import * as React from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { Progress } from "./progress"

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Progress bar component for displaying completion status. Built on Radix UI Progress with smooth transitions.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Progress value (0-100)",
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
    value: 60,
  },
}

export const Empty: Story = {
  args: {
    value: 0,
  },
  parameters: {
    docs: {
      description: {
        story: "Progress bar at 0% completion.",
      },
    },
  },
}

export const Complete: Story = {
  args: {
    value: 100,
  },
  parameters: {
    docs: {
      description: {
        story: "Progress bar at 100% completion.",
      },
    },
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground">Chargement...</span>
        <span className="text-muted-foreground">75%</span>
      </div>
      <Progress value={75} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Progress bar with label and percentage indicator.",
      },
    },
  },
}

export const TicketSales: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">Standard</span>
          <span className="text-muted-foreground">85/100 vendus</span>
        </div>
        <Progress value={85} className="h-2" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">VIP</span>
          <span className="text-muted-foreground">45/50 vendus</span>
        </div>
        <Progress value={90} className="h-2" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">Premium</span>
          <span className="text-destructive font-medium">Complet</span>
        </div>
        <Progress value={100} className="[&>div]:bg-destructive h-2" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Progress bars showing ticket availability status.",
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Small (h-1)</span>
        <Progress value={60} className="h-1" />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Default (h-2)</span>
        <Progress value={60} className="h-2" />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Medium (h-3)</span>
        <Progress value={60} className="h-3" />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Large (h-4)</span>
        <Progress value={60} className="h-4" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different progress bar heights using Tailwind utilities.",
      },
    },
  },
}

export const CustomColors: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Primary (default)</span>
        <Progress value={60} />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Success (emerald)</span>
        <Progress value={100} className="[&>div]:bg-emerald-500" />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Warning (amber)</span>
        <Progress value={75} className="[&>div]:bg-amber-500" />
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Destructive (red)</span>
        <Progress value={90} className="[&>div]:bg-destructive" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Progress bars with custom indicator colors.",
      },
    },
  },
}

export const Animated: Story = {
  render: function AnimatedProgress() {
    const [value, setValue] = React.useState(0)

    React.useEffect(() => {
      const timer = setInterval(() => {
        setValue((prev) => {
          if (prev >= 100) return 0
          return prev + 10
        })
      }, 500)

      return () => clearInterval(timer)
    }, [])

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Téléchargement en cours...</span>
          <span className="text-muted-foreground">{value}%</span>
        </div>
        <Progress value={value} />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Animated progress bar demonstrating value transitions.",
      },
    },
  },
}

export const StepProgress: Story = {
  render: () => {
    const steps = [
      { label: "Sélection", completed: true },
      { label: "Paiement", completed: true },
      { label: "Confirmation", completed: false },
    ]
    const completedCount = steps.filter((s) => s.completed).length
    const progress = (completedCount / steps.length) * 100

    return (
      <div className="space-y-4">
        <Progress value={progress} className="h-1" />
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`flex flex-col items-center ${
                step.completed ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step.completed
                    ? "bg-primary text-primary-foreground"
                    : "border-muted-foreground border-2"
                }`}
              >
                {step.completed ? "✓" : index + 1}
              </div>
              <span className="mt-1 text-xs">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Progress bar combined with step indicators for multi-step flows.",
      },
    },
  },
}

export const FileUpload: Story = {
  render: function FileUploadProgress() {
    const [progress, setProgress] = React.useState(0)
    const [status, setStatus] = React.useState<
      "idle" | "uploading" | "complete"
    >("idle")

    const startUpload = () => {
      setStatus("uploading")
      setProgress(0)
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer)
            setStatus("complete")
            return 100
          }
          return prev + Math.random() * 20
        })
      }, 200)
    }

    return (
      <div className="space-y-4">
        {status === "idle" && (
          <button
            onClick={startUpload}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
          >
            Télécharger un fichier
          </button>
        )}
        {status === "uploading" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">photo_billet.jpg</span>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}
        {status === "complete" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">photo_billet.jpg</span>
              <span className="text-emerald-500">Terminé ✓</span>
            </div>
            <Progress value={100} className="[&>div]:bg-emerald-500" />
            <button
              onClick={() => setStatus("idle")}
              className="text-primary text-sm"
            >
              Télécharger un autre fichier
            </button>
          </div>
        )}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Progress bar for file upload with state management.",
      },
    },
  },
}
