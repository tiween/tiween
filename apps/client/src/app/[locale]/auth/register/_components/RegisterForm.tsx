"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { SocialLogin } from "@/features/auth/components/SocialLogin"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import { useLocale, useTranslations } from "next-intl"
import { useForm, useWatch } from "react-hook-form"
import * as z from "zod"

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIRE_DIGIT,
  PASSWORD_REQUIRE_LOWERCASE,
  PASSWORD_REQUIRE_UPPERCASE,
} from "@/lib/constants"
import { Link } from "@/lib/navigation"
import { cn } from "@/lib/styles"
import { useUserMutations } from "@/hooks/useUser"
import { PasswordStrengthIndicator } from "@/features/auth/components/RegisterForm/PasswordStrength"
import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

// To enable email confirmation, Strapi Users-Permissions plugin must be configured (e.g. email provider, redirect URL)
// Local dev: https://api.tiween.localhost:1355/admin/settings/users-permissions/advanced-settings
const ENABLE_EMAIL_CONFIRMATION = false

export interface RegisterFormProps {
  /** Enable Google OAuth button */
  enableGoogle?: boolean
  /** Enable Facebook OAuth button */
  enableFacebook?: boolean
}

export function RegisterForm({
  enableGoogle = false,
  enableFacebook = false,
}: RegisterFormProps = {}) {
  const t = useTranslations("auth.register")
  const tSocial = useTranslations("auth.social")
  const locale = useLocale()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { registerMutation } = useUserMutations()
  const { data: session } = useSession()
  const [isAutoLoggingIn, setIsAutoLoggingIn] = React.useState(false)
  const [loadingProvider, setLoadingProvider] = React.useState<
    "google" | "facebook" | null
  >(null)

  // Get callback URL from search params (or default to home)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const showSocialLogin = enableGoogle || enableFacebook

  // Surface OAuth errors mapped by the NextAuth jwt callback onto
  // `session.error` (`oauth_error` / `different_provider`). A one-shot ref keyed
  // on the code prevents the sticky-in-JWT error from re-toasting on every re-render.
  const shownErrorRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const error = session?.error
    if (
      (error === "oauth_error" || error === "different_provider") &&
      shownErrorRef.current !== error
    ) {
      shownErrorRef.current = error
      toast({
        variant: "destructive",
        description: tSocial(`errors.${error}`),
      })
    }
  }, [session?.error, toast, tSocial])

  async function handleOAuthSignIn(provider: "google" | "facebook") {
    setLoadingProvider(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      toast({
        variant: "destructive",
        description: tSocial("error"),
      })
      setLoadingProvider(null)
    }
  }

  const form = useForm<z.infer<FormSchemaType>>({
    resolver: zodResolver(RegisterFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  const passwordValue = useWatch({ control: form.control, name: "password" })

  // The strength meter (getPasswordStrength) can report "strong" for a password
  // this form actually rejects (e.g. no digit). Cap the displayed strength at
  // "medium" whenever the enforced hard policy is not met, so the meter never
  // contradicts the validation. Logic is kept local to this routed form.
  const password = passwordValue ?? ""
  const meetsHardPolicy =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    (!PASSWORD_REQUIRE_UPPERCASE || /[A-Z]/.test(password)) &&
    (!PASSWORD_REQUIRE_LOWERCASE || /[a-z]/.test(password)) &&
    (!PASSWORD_REQUIRE_DIGIT || /\d/.test(password))

  async function onSubmit(values: z.infer<FormSchemaType>) {
    registerMutation.mutate(
      {
        username: values.email,
        email: values.email,
        password: values.password,
        firstName: values.name.trim(),
        locale,
      },
      {
        onSuccess: async () => {
          // Auto-login after successful registration (if email confirmation is disabled)
          if (!ENABLE_EMAIL_CONFIRMATION) {
            setIsAutoLoggingIn(true)
            try {
              const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
              })

              if (result?.ok) {
                // Redirect to callback URL or home
                window.location.href = callbackUrl
              } else {
                // If auto-login fails, show success and link to sign in
                toast({
                  title: t("status.success"),
                  description: "Please sign in with your new account.",
                })
                setIsAutoLoggingIn(false)
              }
            } catch {
              setIsAutoLoggingIn(false)
            }
          }
        },
        onError: (error) => {
          const errorMap = {
            "already taken": t("errors.emailUsernameTaken"),
          } as const

          let errorMessage = t("errors.unexpectedError")

          if (error instanceof Error) {
            const errorKey = Object.keys(errorMap).find(
              (key): key is keyof typeof errorMap =>
                error.message?.includes(key)
            )

            errorMessage = errorKey ? errorMap[errorKey] : errorMessage
          }

          toast({
            variant: "destructive",
            description: errorMessage,
          })
        },
      }
    )
  }

  // Show loading state during auto-login
  if (isAutoLoggingIn) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">{t("status.success")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Connexion en cours...</p>
        </CardContent>
      </Card>
    )
  }

  // Show success state if email confirmation is required
  if (registerMutation.isSuccess && ENABLE_EMAIL_CONFIRMATION) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <h2 className="mx-auto">{t("checkEmail")}</h2>
        </CardHeader>
        <CardContent>
          <Link
            href="/auth/signin"
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-[44px] w-full"
            )}
          >
            <p>{t("signInLink")}</p>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle>{t("header")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSocialLogin && (
            <SocialLogin
              onGoogleClick={() => handleOAuthSignIn("google")}
              onFacebookClick={() => handleOAuthSignIn("facebook")}
              isGoogleLoading={loadingProvider === "google"}
              isFacebookLoading={loadingProvider === "facebook"}
              disabled={registerMutation.isPending || loadingProvider !== null}
              labels={{
                google: tSocial("google"),
                facebook: tSocial("facebook"),
                divider: tSocial("divider"),
              }}
            />
          )}
          <AppForm form={form} onSubmit={onSubmit} id={registerFormName}>
            <AppField name="name" type="text" required label={t("name")} />
            <AppField name="email" type="text" required label={t("email")} />
            <div className="space-y-2">
              <AppField
                name="password"
                type="password"
                required
                label={t("password")}
              />
              <PasswordStrengthIndicator
                password={password}
                maxStrength={meetsHardPolicy ? undefined : "medium"}
                labels={{
                  weak: t("passwordStrength.weak"),
                  medium: t("passwordStrength.medium"),
                  strong: t("passwordStrength.strong"),
                }}
              />
            </div>
            <AppField
              name="passwordConfirmation"
              type="password"
              required
              label={t("checkPassword")}
            />
          </AppForm>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Button
            type="submit"
            size="lg"
            variant="default"
            form={registerFormName}
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Inscription...
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </CardFooter>
      </Card>

      <p className="mx-auto flex gap-1">
        {t("signInLinkLinkDescription")}
        <span>
          <Link href="/auth/signin" className="underline">
            {t("signInLink")}.
          </Link>
        </span>
      </p>
    </div>
  )
}

const RegisterFormSchema = z
  .object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(PASSWORD_MIN_LENGTH),
    passwordConfirmation: z.string().min(PASSWORD_MIN_LENGTH),
  })
  .superRefine((data, ctx) => {
    if (!data.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "nameRequired" },
        path: ["name"],
      })
    }

    if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "passwordUppercase" },
        path: ["password"],
      })
    }

    if (PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "passwordLowercase" },
        path: ["password"],
      })
    }

    if (PASSWORD_REQUIRE_DIGIT && !/\d/.test(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "passwordDigit" },
        path: ["password"],
      })
    }

    if (data.password.length > PASSWORD_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "passwordTooLong" },
        path: ["password"],
      })
    }

    if (data.password !== data.passwordConfirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "checkPassword" },
        path: ["passwordConfirmation"],
      })
    }
  })

type FormSchemaType = typeof RegisterFormSchema

const registerFormName = "registerForm"
