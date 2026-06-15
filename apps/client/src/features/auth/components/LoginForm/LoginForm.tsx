"use client"

import * as React from "react"
import { SocialLogin } from "@/features/auth/components/SocialLogin"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import type { LoginFormData } from "./loginSchema"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { loginSchema } from "./loginSchema"

/**
 * Localized labels for LoginForm
 */
export interface LoginFormLabels {
  title: string
  email: string
  emailPlaceholder: string
  password: string
  passwordPlaceholder: string
  showPassword: string
  hidePassword: string
  forgotPassword: string
  submit: string
  submitting: string
  createAccount: string
  createAccountPrompt: string
  socialDivider: string
  socialGoogle: string
  socialFacebook: string
  errors: {
    REQUIRED: string
    INVALID_EMAIL: string
  }
}

const defaultLabels: LoginFormLabels = {
  title: "Connexion",
  email: "Email",
  emailPlaceholder: "votre@email.com",
  password: "Mot de passe",
  passwordPlaceholder: "••••••••",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  forgotPassword: "Mot de passe oublié ?",
  submit: "Se connecter",
  submitting: "Connexion...",
  createAccount: "Créer un compte",
  createAccountPrompt: "Pas encore de compte ?",
  socialDivider: "ou",
  socialGoogle: "Continuer avec Google",
  socialFacebook: "Continuer avec Facebook",
  errors: {
    REQUIRED: "Ce champ est requis",
    INVALID_EMAIL: "Email invalide",
  },
}

export interface LoginFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: LoginFormData) => void | Promise<void>
  /** Called when "Forgot password" link is clicked */
  onForgotPassword?: () => void
  /** Called when "Create account" link is clicked */
  onCreateAccount?: () => void
  /** Called when a social login button is clicked */
  onSocialLogin?: (provider: "google" | "facebook") => void
  /** Show loading spinner and disable form */
  isLoading?: boolean
  /** Error message to display (e.g., from server) */
  error?: string
  /** Localized labels */
  labels?: LoginFormLabels
  /** Additional class names */
  className?: string
}

/**
 * LoginForm - Email/password login form with social login options
 *
 * Features:
 * - Email input with validation
 * - Password input with show/hide toggle
 * - "Forgot password" link
 * - Submit button with loading state
 * - Social login buttons (Google, Facebook)
 * - "Create account" link
 * - Inline error messages
 * - Full RTL support via CSS logical properties
 * - Zod validation with translatable error codes
 *
 * @example
 * ```tsx
 * <LoginForm
 *   onSubmit={async (data) => signIn(data)}
 *   onForgotPassword={() => router.push("/forgot-password")}
 *   onCreateAccount={() => router.push("/register")}
 *   onSocialLogin={(provider) => signIn(provider)}
 *   isLoading={isPending}
 * />
 * ```
 */
export function LoginForm({
  onSubmit,
  onForgotPassword,
  onCreateAccount,
  onSocialLogin,
  isLoading = false,
  error,
  labels = defaultLabels,
  className,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const handleSubmit = React.useCallback(
    async (data: LoginFormData) => {
      await onSubmit(data)
    },
    [onSubmit]
  )

  // Translate error codes to messages
  const translateError = React.useCallback(
    (code: string) => {
      const errorMessages = labels.errors as Record<string, string>
      return errorMessages[code] || code
    },
    [labels.errors]
  )

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Social login buttons */}
      {onSocialLogin && (
        <SocialLogin
          onGoogleClick={() => onSocialLogin("google")}
          onFacebookClick={() => onSocialLogin("facebook")}
          disabled={isLoading}
          labels={{
            google: labels.socialGoogle,
            facebook: labels.socialFacebook,
            divider: labels.socialDivider,
          }}
        />
      )}

      {/* Email/password form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Server error message */}
          {error && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Email field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{labels.email}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={labels.emailPlaceholder}
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Password field with toggle */}
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{labels.password}</FormLabel>
                  {onForgotPassword && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={onForgotPassword}
                      className="h-auto p-0 text-xs"
                      tabIndex={-1}
                    >
                      {labels.forgotPassword}
                    </Button>
                  )}
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={labels.passwordPlaceholder}
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pe-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      aria-label={
                        showPassword ? labels.hidePassword : labels.showPassword
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <Eye className="text-muted-foreground h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Submit button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {labels.submitting}
              </>
            ) : (
              labels.submit
            )}
          </Button>
        </form>
      </Form>

      {/* Create account link */}
      {onCreateAccount && (
        <div className="text-muted-foreground text-center text-sm">
          {labels.createAccountPrompt}{" "}
          <Button
            type="button"
            variant="link"
            onClick={onCreateAccount}
            className="h-auto p-0"
          >
            {labels.createAccount}
          </Button>
        </div>
      )}
    </div>
  )
}

LoginForm.displayName = "LoginForm"
