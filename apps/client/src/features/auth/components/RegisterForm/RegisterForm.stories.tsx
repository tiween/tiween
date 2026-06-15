import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { RegisterFormData } from "./registerSchema"

import { RegisterForm } from "./RegisterForm"

const meta: Meta<typeof RegisterForm> = {
  title: "Features/Auth/RegisterForm",
  component: RegisterForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Registration form with name, email, password with strength indicator, confirm password, and terms acceptance. Includes Zod validation with inline error messages and full RTL support.",
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
type Story = StoryObj<typeof RegisterForm>

/**
 * Default state with all features enabled
 */
export const Default: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onLogin: () => console.log("Login clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    onTermsClick: () => console.log("Terms clicked"),
  },
}

/**
 * Form with server error displayed
 */
export const WithError: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onLogin: () => console.log("Login clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    error: "Un compte avec cet email existe déjà",
  },
}

/**
 * Form in loading state
 */
export const Loading: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
    onLogin: () => console.log("Login clicked"),
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
    onLogin: () => console.log("Login clicked"),
    onTermsClick: () => console.log("Terms clicked"),
  },
}

/**
 * Minimal form (only registration fields)
 */
export const Minimal: Story = {
  args: {
    onSubmit: (data) => console.log("Submit:", data),
  },
}

/**
 * Interactive demo with simulated registration
 */
export const Interactive: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()

    const handleSubmit = async (data: RegisterFormData) => {
      setIsLoading(true)
      setError(undefined)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate error for specific email
      if (data.email === "existing@test.com") {
        setError("Un compte avec cet email existe déjà")
      } else {
        console.log("Registration successful:", data)
        alert("Registration successful! Check console for data.")
      }

      setIsLoading(false)
    }

    return (
      <RegisterForm
        onSubmit={handleSubmit}
        onLogin={() => alert("Login clicked")}
        onSocialLogin={(provider) => alert(`Social login: ${provider}`)}
        onTermsClick={() => alert("Terms clicked")}
        isLoading={isLoading}
        error={error}
      />
    )
  },
}

/**
 * Story showing weak password indicator
 */
export const WeakPassword: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    return (
      <RegisterForm
        onSubmit={async (data) => {
          setIsLoading(true)
          await new Promise((r) => setTimeout(r, 1000))
          console.log("Submit:", data)
          setIsLoading(false)
        }}
        onLogin={() => console.log("Login clicked")}
        onSocialLogin={(provider) => console.log("Social login:", provider)}
        isLoading={isLoading}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'Try entering a weak password (e.g., "password") to see the strength indicator.',
      },
    },
  },
}

/**
 * Story demonstrating password mismatch validation
 */
export const PasswordMismatch: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    return (
      <RegisterForm
        onSubmit={async (data) => {
          setIsLoading(true)
          await new Promise((r) => setTimeout(r, 1000))
          console.log("Submit:", data)
          setIsLoading(false)
        }}
        onLogin={() => console.log("Login clicked")}
        isLoading={isLoading}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Try entering different values in password and confirm password fields to see the mismatch error.",
      },
    },
  },
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  render: () => (
    <div dir="rtl" lang="ar" className="font-arabic">
      <RegisterForm
        onSubmit={(data) => console.log("Submit:", data)}
        onLogin={() => console.log("Login clicked")}
        onSocialLogin={(provider) => console.log("Social login:", provider)}
        onTermsClick={() => console.log("Terms clicked")}
        labels={{
          title: "إنشاء حساب",
          name: "الاسم الكامل",
          namePlaceholder: "اسمك",
          email: "البريد الإلكتروني",
          emailPlaceholder: "your@email.com",
          password: "كلمة المرور",
          passwordPlaceholder: "••••••••",
          confirmPassword: "تأكيد كلمة المرور",
          confirmPasswordPlaceholder: "••••••••",
          showPassword: "إظهار كلمة المرور",
          hidePassword: "إخفاء كلمة المرور",
          acceptTerms: "أوافق على",
          termsLink: "شروط الاستخدام",
          submit: "إنشاء الحساب",
          submitting: "جاري الإنشاء...",
          login: "تسجيل الدخول",
          loginPrompt: "لديك حساب بالفعل؟",
          socialDivider: "أو",
          socialGoogle: "المتابعة مع Google",
          socialFacebook: "المتابعة مع Facebook",
          passwordStrength: {
            weak: "ضعيف",
            medium: "متوسط",
            strong: "قوي",
          },
          errors: {
            REQUIRED: "هذا الحقل مطلوب",
            INVALID_EMAIL: "البريد الإلكتروني غير صالح",
            NAME_TOO_SHORT: "يجب أن يحتوي الاسم على حرفين على الأقل",
            PASSWORD_TOO_SHORT: "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل",
            PASSWORDS_DONT_MATCH: "كلمتا المرور غير متطابقتين",
            TERMS_REQUIRED: "يجب الموافقة على شروط الاستخدام",
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
    onLogin: () => console.log("Login clicked"),
    onSocialLogin: (provider) => console.log("Social login:", provider),
    onTermsClick: () => console.log("Terms clicked"),
    labels: {
      title: "Create Account",
      name: "Full Name",
      namePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "••••••••",
      showPassword: "Show password",
      hidePassword: "Hide password",
      acceptTerms: "I agree to the",
      termsLink: "Terms of Service",
      submit: "Create Account",
      submitting: "Creating...",
      login: "Sign in",
      loginPrompt: "Already have an account?",
      socialDivider: "or",
      socialGoogle: "Continue with Google",
      socialFacebook: "Continue with Facebook",
      passwordStrength: {
        weak: "Weak",
        medium: "Medium",
        strong: "Strong",
      },
      errors: {
        REQUIRED: "This field is required",
        INVALID_EMAIL: "Invalid email address",
        NAME_TOO_SHORT: "Name must be at least 2 characters",
        PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
        PASSWORDS_DONT_MATCH: "Passwords do not match",
        TERMS_REQUIRED: "You must accept the terms",
      },
    },
  },
}
