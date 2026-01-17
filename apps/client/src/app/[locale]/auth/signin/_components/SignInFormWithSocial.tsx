"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { SocialLogin } from "@/features/auth/components/SocialLogin"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { safeJSONParse } from "@/lib/general-helpers"
import { Link, useRouter } from "@/lib/navigation"
import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export interface SignInFormWithSocialProps {
  /** Enable Google OAuth button */
  enableGoogle?: boolean
  /** Enable Facebook OAuth button */
  enableFacebook?: boolean
}

/**
 * SignInFormWithSocial - Enhanced sign-in form with social login options
 *
 * Features:
 * - Email/password authentication via Strapi
 * - Google OAuth integration (when enabled)
 * - Facebook OAuth integration (when enabled)
 * - Loading states per provider
 * - Error handling with toast notifications
 * - Callback URL preservation
 */
export function SignInFormWithSocial({
  enableGoogle = false,
  enableFacebook = false,
}: SignInFormWithSocialProps) {
  const t = useTranslations("auth.signIn")
  const tSocial = useTranslations("auth.social")
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  // Track which OAuth provider is loading
  const [loadingProvider, setLoadingProvider] = React.useState<
    "google" | "facebook" | null
  >(null)

  const form = useForm<z.infer<FormSchemaType>>({
    resolver: zodResolver(SignInFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "", password: "" },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: z.infer<FormSchemaType>) {
    const res = await signIn("credentials", {
      ...values,
      callbackUrl,
      redirect: false,
    })

    if (!res?.error) {
      router.refresh()
      setTimeout(() => router.push(callbackUrl), 300)
    } else {
      const parsedError = safeJSONParse<{ message?: string }>(res.error)
      const message =
        "message" in parsedError
          ? parsedError.message
          : t("errors.CredentialsSignin")

      toast({
        variant: "destructive",
        description: message,
      })
    }
  }

  /**
   * Handle OAuth sign-in
   * Uses redirect: true to let NextAuth handle the OAuth flow
   */
  async function handleOAuthSignIn(provider: "google" | "facebook") {
    setLoadingProvider(provider)
    try {
      // Use redirect: true for OAuth - NextAuth handles the redirect flow
      await signIn(provider, { callbackUrl })
    } catch {
      toast({
        variant: "destructive",
        description: tSocial("error"),
      })
      setLoadingProvider(null)
    }
  }

  const showSocialLogin = enableGoogle || enableFacebook

  return (
    <Card className="m-auto w-[400px]">
      <CardHeader>
        <CardTitle>{t("header")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social login buttons */}
        {showSocialLogin && (
          <SocialLogin
            onGoogleClick={() => handleOAuthSignIn("google")}
            onFacebookClick={() => handleOAuthSignIn("facebook")}
            isGoogleLoading={loadingProvider === "google"}
            isFacebookLoading={loadingProvider === "facebook"}
            disabled={isSubmitting || loadingProvider !== null}
            labels={{
              google: tSocial("google"),
              facebook: tSocial("facebook"),
              divider: tSocial("divider"),
            }}
          />
        )}

        {/* Email/password form */}
        <AppForm form={form} onSubmit={onSubmit} id={signInFormName}>
          <AppField
            name="email"
            type="text"
            autoComplete="email"
            required
            label={t("email")}
          />
          <AppField
            name="password"
            type="password"
            autoComplete="current-password"
            required
            label={t("password")}
          />
        </AppForm>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2">
        <Button
          type="submit"
          size="lg"
          variant="default"
          form={signInFormName}
          disabled={isSubmitting || loadingProvider !== null}
          className="w-full"
        >
          {t("submit")}
        </Button>

        <div className="mt-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/forgot-password">{t("forgotPassword")}?</Link>
          </Button>

          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/register">{t("createAccount")}</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

const SignInFormSchema = z.object({
  email: z.string().min(1).email().or(z.string().min(1)),
  password: z.string().min(1),
})

type FormSchemaType = typeof SignInFormSchema

const signInFormName = "signInForm"
