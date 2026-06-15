"use client"

import * as React from "react"
import { SocialLogin } from "@/features/auth/components/SocialLogin"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import type { PasswordStrengthLabels } from "./PasswordStrength"
import type { RegisterFormData } from "./registerSchema"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { PasswordStrengthIndicator } from "./PasswordStrength"
import { registerSchema } from "./registerSchema"

/**
 * Localized labels for RegisterForm
 */
export interface RegisterFormLabels {
  title: string
  name: string
  namePlaceholder: string
  email: string
  emailPlaceholder: string
  password: string
  passwordPlaceholder: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  showPassword: string
  hidePassword: string
  acceptTerms: string
  termsLink: string
  submit: string
  submitting: string
  login: string
  loginPrompt: string
  socialDivider: string
  socialGoogle: string
  socialFacebook: string
  passwordStrength: PasswordStrengthLabels
  errors: {
    REQUIRED: string
    INVALID_EMAIL: string
    NAME_TOO_SHORT: string
    PASSWORD_TOO_SHORT: string
    PASSWORDS_DONT_MATCH: string
    TERMS_REQUIRED: string
  }
}

const defaultLabels: RegisterFormLabels = {
  title: "Créer un compte",
  name: "Nom complet",
  namePlaceholder: "Votre nom",
  email: "Email",
  emailPlaceholder: "votre@email.com",
  password: "Mot de passe",
  passwordPlaceholder: "••••••••",
  confirmPassword: "Confirmer le mot de passe",
  confirmPasswordPlaceholder: "••••••••",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  acceptTerms: "J'accepte les",
  termsLink: "conditions d'utilisation",
  submit: "Créer mon compte",
  submitting: "Création...",
  login: "Se connecter",
  loginPrompt: "Déjà un compte ?",
  socialDivider: "ou",
  socialGoogle: "Continuer avec Google",
  socialFacebook: "Continuer avec Facebook",
  passwordStrength: {
    weak: "Faible",
    medium: "Moyen",
    strong: "Fort",
  },
  errors: {
    REQUIRED: "Ce champ est requis",
    INVALID_EMAIL: "Email invalide",
    NAME_TOO_SHORT: "Le nom doit contenir au moins 2 caractères",
    PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères",
    PASSWORDS_DONT_MATCH: "Les mots de passe ne correspondent pas",
    TERMS_REQUIRED: "Vous devez accepter les conditions d'utilisation",
  },
}

export interface RegisterFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: RegisterFormData) => void | Promise<void>
  /** Called when "Already have account" link is clicked */
  onLogin?: () => void
  /** Called when a social login button is clicked */
  onSocialLogin?: (provider: "google" | "facebook") => void
  /** Called when terms link is clicked */
  onTermsClick?: () => void
  /** Show loading spinner and disable form */
  isLoading?: boolean
  /** Error message to display (e.g., from server) */
  error?: string
  /** Localized labels */
  labels?: RegisterFormLabels
  /** Additional class names */
  className?: string
}

/**
 * RegisterForm - User registration form with validation
 *
 * Features:
 * - Name input
 * - Email input with validation
 * - Password input with strength indicator
 * - Confirm password input with match validation
 * - Terms acceptance checkbox
 * - Social login buttons (Google, Facebook)
 * - "Already have account" link
 * - Inline error messages
 * - Full RTL support via CSS logical properties
 * - Zod validation with translatable error codes
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   onSubmit={async (data) => register(data)}
 *   onLogin={() => router.push("/login")}
 *   onSocialLogin={(provider) => signIn(provider)}
 *   onTermsClick={() => router.push("/terms")}
 *   isLoading={isPending}
 * />
 * ```
 */
export function RegisterForm({
  onSubmit,
  onLogin,
  onSocialLogin,
  onTermsClick,
  isLoading = false,
  error,
  labels = defaultLabels,
  className,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true, // Type coercion for form default
    },
  })

  // Watch password for strength indicator
  const password = form.watch("password")

  const handleSubmit = React.useCallback(
    async (data: RegisterFormData) => {
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

      {/* Registration form */}
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

          {/* Name field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{labels.name}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={labels.namePlaceholder}
                    autoComplete="name"
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

          {/* Password field with strength indicator */}
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{labels.password}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={labels.passwordPlaceholder}
                      autoComplete="new-password"
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
                <PasswordStrengthIndicator
                  password={password}
                  labels={labels.passwordStrength}
                />
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Confirm password field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{labels.confirmPassword}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={labels.confirmPasswordPlaceholder}
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="pe-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      aria-label={
                        showConfirmPassword
                          ? labels.hidePassword
                          : labels.showPassword
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
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

          {/* Terms checkbox */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rtl:space-x-reverse">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    {labels.acceptTerms}{" "}
                    {onTermsClick ? (
                      <Button
                        type="button"
                        variant="link"
                        onClick={onTermsClick}
                        className="h-auto p-0 text-sm"
                      >
                        {labels.termsLink}
                      </Button>
                    ) : (
                      <span className="text-primary underline">
                        {labels.termsLink}
                      </span>
                    )}
                  </FormLabel>
                  {fieldState.error?.message && (
                    <p className="text-destructive text-[0.8rem] font-medium">
                      {translateError(fieldState.error.message)}
                    </p>
                  )}
                </div>
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

      {/* Login link */}
      {onLogin && (
        <div className="text-muted-foreground text-center text-sm">
          {labels.loginPrompt}{" "}
          <Button
            type="button"
            variant="link"
            onClick={onLogin}
            className="h-auto p-0"
          >
            {labels.login}
          </Button>
        </div>
      )}
    </div>
  )
}

RegisterForm.displayName = "RegisterForm"
