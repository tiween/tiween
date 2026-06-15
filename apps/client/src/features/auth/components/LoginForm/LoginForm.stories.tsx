import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { LoginFormData } from "./loginSchema"

import { LoginForm } from "./LoginForm"

const meta: Meta<typeof LoginForm> = {
  title: "Features/Auth/LoginForm",
  component: LoginForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Login form with email/password fields, social login options, and password visibility toggle. Includes Zod validation with inline error messages and full RTL support.",
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
type Story = StoryObj<typeof LoginForm>

/**
 * Default state with all features enabled
 */
export const Default: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onForgotPassword: () => console.log("Forgot password clicked"),
    onCreateAccount: () => console.log("Create account clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
  },
}

/**
 * Form with server error displayed
 */
export const WithError: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onForgotPassword: () => console.log("Forgot password clicked"),
    onCreateAccount: () => console.log("Create account clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    error: "Email ou mot de passe incorrect",
  },
}

/**
 * Form in loading state
 */
export const Loading: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onForgotPassword: () => console.log("Forgot password clicked"),
    onCreateAccount: () => console.log("Create account clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    isLoading: true,
  },
}

/**
 * Form without social login options
 */
export const WithoutSocialLogin: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onForgotPassword: () => console.log("Forgot password clicked"),
    onCreateAccount: () => console.log("Create account clicked"),
  },
}

/**
 * Minimal form (only email/password)
 */
export const Minimal: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
  },
}

/**
 * Interactive demo with simulated authentication
 */
export const Interactive: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()

    const handleSubmit = async (data: LoginFormData) => {
      setIsLoading(true)
      setError(undefined)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate error for specific email
      if (data.email === "error@test.com") {
        setError("Email ou mot de passe incorrect")
      } else {
        console.log("Login successful:", data)
        alert("Login successful! Check console for data.")
      }

      setIsLoading(false)
    }

    return (
      <LoginForm
        onSubmit={handleSubmit}
        onForgotPassword={() => alert("Forgot password clicked")}
        onCreateAccount={() => alert("Create account clicked")}
        onSocialLogin={(provider) => alert(`Social login: ${provider}`)}
        isLoading={isLoading}
        error={error}
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
      <LoginForm
        onSubmit={(data) => console.log("Submit:", data)}
        onForgotPassword={() => console.log("Forgot password clicked")}
        onCreateAccount={() => console.log("Create account clicked")}
        onSocialLogin={(provider) => console.log("Social login:", provider)}
        labels={{
          title: "تسجيل الدخول",
          email: "البريد الإلكتروني",
          emailPlaceholder: "your@email.com",
          password: "كلمة المرور",
          passwordPlaceholder: "••••••••",
          showPassword: "إظهار كلمة المرور",
          hidePassword: "إخفاء كلمة المرور",
          forgotPassword: "نسيت كلمة المرور؟",
          submit: "تسجيل الدخول",
          submitting: "جاري التسجيل...",
          createAccount: "إنشاء حساب",
          createAccountPrompt: "ليس لديك حساب؟",
          socialDivider: "أو",
          socialGoogle: "المتابعة مع Google",
          socialFacebook: "المتابعة مع Facebook",
          errors: {
            REQUIRED: "هذا الحقل مطلوب",
            INVALID_EMAIL: "البريد الإلكتروني غير صالح",
          },
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
    onSubmit: (data) => console.log("Submit:", data),
    onForgotPassword: () => console.log("Forgot password clicked"),
    onCreateAccount: () => console.log("Create account clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    labels: {
      title: "Sign In",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      showPassword: "Show password",
      hidePassword: "Hide password",
      forgotPassword: "Forgot password?",
      submit: "Sign In",
      submitting: "Signing in...",
      createAccount: "Create account",
      createAccountPrompt: "Don't have an account?",
      socialDivider: "or",
      socialGoogle: "Continue with Google",
      socialFacebook: "Continue with Facebook",
      errors: {
        REQUIRED: "This field is required",
        INVALID_EMAIL: "Invalid email address",
      },
    },
  },
}
