import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { SocialLogin } from "./SocialLogin"

const meta: Meta<typeof SocialLogin> = {
  title: "Features/Auth/SocialLogin",
  component: SocialLogin,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Social OAuth login buttons for Google and Facebook authentication. Includes branded icons, loading states, and RTL support.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[350px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SocialLogin>

/**
 * Default state with both buttons enabled
 */
export const Default: Story = {
  args: {
    onGoogleClick: () => console.log("Google clicked"),
    onFacebookClick: () => console.log("Facebook clicked"),
  },
}

/**
 * Google button in loading state
 */
export const GoogleLoading: Story = {
  args: {
    onGoogleClick: () => {},
    onFacebookClick: () => {},
    isGoogleLoading: true,
  },
}

/**
 * Facebook button in loading state
 */
export const FacebookLoading: Story = {
  args: {
    onGoogleClick: () => {},
    onFacebookClick: () => {},
    isFacebookLoading: true,
  },
}

/**
 * All buttons disabled
 */
export const Disabled: Story = {
  args: {
    onGoogleClick: () => {},
    onFacebookClick: () => {},
    disabled: true,
  },
}

/**
 * Interactive demo with simulated OAuth flow
 */
export const Interactive: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState<"google" | "facebook" | null>(
      null
    )

    const handleClick = async (provider: "google" | "facebook") => {
      setIsLoading(provider)
      // Simulate OAuth redirect delay
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setIsLoading(null)
      console.log(`${provider} login completed`)
    }

    return (
      <SocialLogin
        onGoogleClick={() => handleClick("google")}
        onFacebookClick={() => handleClick("facebook")}
        isGoogleLoading={isLoading === "google"}
        isFacebookLoading={isLoading === "facebook"}
      />
    )
  },
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  render: () => (
    <div dir="rtl" lang="ar" className="font-arabic">
      <SocialLogin
        onGoogleClick={() => console.log("Google")}
        onFacebookClick={() => console.log("Facebook")}
        labels={{
          google: "المتابعة مع Google",
          facebook: "المتابعة مع Facebook",
          divider: "أو",
        }}
      />
    </div>
  ),
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  args: {
    onGoogleClick: () => {},
    onFacebookClick: () => {},
    labels: {
      google: "Continue with Google",
      facebook: "Continue with Facebook",
      divider: "or",
    },
  },
}

/**
 * Used in a login form context
 */
export const InLoginForm: Story = {
  render: () => (
    <div className="space-y-4">
      <h2 className="text-foreground text-center text-xl font-semibold">
        Se connecter
      </h2>
      <SocialLogin
        onGoogleClick={() => console.log("Google")}
        onFacebookClick={() => console.log("Facebook")}
      />
      <p className="text-muted-foreground text-center text-sm">
        Connectez-vous avec votre email et mot de passe
      </p>
    </div>
  ),
}
