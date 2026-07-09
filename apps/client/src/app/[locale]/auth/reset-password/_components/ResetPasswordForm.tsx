"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
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

export interface ResetPasswordFormProps {
  /** Single-use reset token from the email link (`?code=`). */
  code: string
  /** Account email from the link (`?email=`), used to auto-login after reset. */
  email: string
}

/** Backend error codes → literal i18n keys (next-intl needs static keys). */
type ResetErrorKey =
  | "errors.RESET_TOKEN_EXPIRED"
  | "errors.RESET_TOKEN_INVALID"
  | "errors.weakPassword"
  | "errors.unexpectedError"

function mapErrorToKey(message: string | undefined): ResetErrorKey {
  if (!message) return "errors.unexpectedError"
  if (message.includes("RESET_TOKEN_EXPIRED")) return "errors.RESET_TOKEN_EXPIRED"
  if (message.includes("RESET_TOKEN_INVALID")) return "errors.RESET_TOKEN_INVALID"
  if (/PASSWORD_(TOO_SHORT|TOO_LONG|NO_UPPERCASE|NO_LOWERCASE|NO_DIGIT|REQUIRED)/.test(message))
    return "errors.weakPassword"
  return "errors.unexpectedError"
}

/**
 * Only allow a post-login redirect to a same-origin relative path: a single "/"
 * followed by a non-slash, non-backslash char. This rejects absolute URLs,
 * protocol-relative "//host", and backslash tricks ("/\\host", which the URL
 * parser normalizes to "//host") — all of which are open-redirect vectors.
 */
function safeCallbackUrl(raw: string | null): string {
  // Same-origin relative paths only. Reject protocol-relative (`//`) and
  // backslash (`/\`) targets, AND any ASCII control char (tab/newline/CR):
  // browsers strip those during URL parsing, so `/\n/evil.com` collapses to
  // `//evil.com` and would slip past the leading-char check as an off-origin
  // redirect.
  if (raw && /^\/[^/\\]/.test(raw) && !/[\u0000-\u001f\u007f]/.test(raw)) {
    return raw
  }
  return "/"
}

export function ResetPasswordForm({ code, email }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword")
  const tStrength = useTranslations("auth.register.passwordStrength")
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { resetPasswordMutation } = useUserMutations()
  const [isAutoLoggingIn, setIsAutoLoggingIn] = React.useState(false)

  const form = useForm<z.infer<FormSchemaType>>({
    resolver: zodResolver(ResetPasswordFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { password: "", passwordConfirmation: "" },
  })

  const passwordValue = useWatch({ control: form.control, name: "password" })
  const password = passwordValue ?? ""

  // Cap the strength meter at "medium" whenever the enforced hard policy is not
  // met, so the meter never contradicts the validation (mirrors RegisterForm).
  const meetsHardPolicy =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    (!PASSWORD_REQUIRE_UPPERCASE || /[A-Z]/.test(password)) &&
    (!PASSWORD_REQUIRE_LOWERCASE || /[a-z]/.test(password)) &&
    (!PASSWORD_REQUIRE_DIGIT || /\d/.test(password))

  function onSubmit(values: z.infer<FormSchemaType>) {
    resetPasswordMutation.mutate(
      {
        code,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      },
      {
        onSuccess: async () => {
          // Auto-login with the email from the link + the new password.
          setIsAutoLoggingIn(true)
          try {
            const result = await signIn("credentials", {
              email,
              password: values.password,
              redirect: false,
            })

            if (result?.ok) {
              window.location.href = safeCallbackUrl(
                searchParams.get("callbackUrl")
              )
            } else {
              // Auto-login failed → confirm success and link to manual sign-in.
              toast({
                title: t("successfullySet"),
                description: t("manualSignInPrompt"),
              })
              setIsAutoLoggingIn(false)
            }
          } catch {
            setIsAutoLoggingIn(false)
          }
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : undefined
          toast({
            variant: "destructive",
            description: t(mapErrorToKey(message)),
          })
        },
      }
    )
  }

  // Missing token → the link is invalid/incomplete; do not render the form.
  if (!code) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle>{t("header")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm">{t("invalidLink")}</p>
          <Link
            href="/auth/forgot-password"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {t("requestNewLink")}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (isAutoLoggingIn) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">
            {t("successfullySet")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{t("signingIn")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="m-auto w-[400px]">
      <CardHeader>
        <CardTitle>{t("header")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm form={form} onSubmit={onSubmit} id={resetPasswordFormName}>
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
                weak: tStrength("weak"),
                medium: tStrength("medium"),
                strong: tStrength("strong"),
              }}
            />
          </div>
          <AppField
            name="passwordConfirmation"
            type="password"
            required
            label={t("confirmPassword")}
          />
        </AppForm>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          size="lg"
          variant="default"
          form={resetPasswordFormName}
          className="w-full"
          disabled={resetPasswordMutation.isPending}
        >
          {resetPasswordMutation.isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("submit")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

const ResetPasswordFormSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH),
    passwordConfirmation: z.string().min(PASSWORD_MIN_LENGTH),
  })
  .superRefine((data, ctx) => {
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

type FormSchemaType = typeof ResetPasswordFormSchema

const resetPasswordFormName = "resetPasswordForm"
