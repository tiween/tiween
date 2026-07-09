"use client"

import * as React from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/lib/navigation"
import { cn } from "@/lib/styles"
import { useUserMutations } from "@/hooks/useUser"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface ConfirmEmailChangeProps {
  /** Single-use confirmation token from the email link (`?code=`). */
  code: string
}

/** Backend error codes → literal i18n keys (next-intl needs static keys). */
type ConfirmErrorKey =
  | "errors.EMAIL_CHANGE_TOKEN_EXPIRED"
  | "errors.EMAIL_CHANGE_TOKEN_INVALID"
  | "errors.EMAIL_TAKEN"
  | "errors.unexpectedError"

function mapErrorToKey(message: string | undefined): ConfirmErrorKey {
  if (!message) return "errors.unexpectedError"
  if (message.includes("EMAIL_CHANGE_TOKEN_EXPIRED"))
    return "errors.EMAIL_CHANGE_TOKEN_EXPIRED"
  if (message.includes("EMAIL_CHANGE_TOKEN_INVALID"))
    return "errors.EMAIL_CHANGE_TOKEN_INVALID"
  if (message.includes("EMAIL_TAKEN")) return "errors.EMAIL_TAKEN"
  return "errors.unexpectedError"
}

/**
 * ConfirmEmailChange — the email-change confirmation landing page.
 *
 * Auto-submits the `?code=` token to `POST /auth/confirm-email-change` once on
 * mount. On success the live email is now updated server-side; because the
 * NextAuth session re-fetches `/users/me`, it nudges the user to sign in again
 * so the session email refreshes immediately. Expired / invalid / taken tokens
 * surface their mapped `profile.errors.*` message and make no change.
 */
export function ConfirmEmailChange({ code }: ConfirmEmailChangeProps) {
  const t = useTranslations("profile")
  const { confirmEmailChangeMutation } = useUserMutations()
  const { mutate } = confirmEmailChangeMutation
  const hasRun = React.useRef(false)

  React.useEffect(() => {
    if (!code || hasRun.current) {
      return
    }
    hasRun.current = true
    mutate({ code })
  }, [code, mutate])

  // Missing token → the link is invalid/incomplete; do not attempt a confirm.
  if (!code) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle>{t("changeEmail.confirm.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <XCircle className="text-destructive h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {t("changeEmail.confirm.invalidLink")}
          </p>
          <Link
            href="/auth/profile"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {t("changeEmail.confirm.backToProfile")}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (confirmEmailChangeMutation.isSuccess) {
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">
            {t("changeEmail.confirm.successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="text-muted-foreground text-center text-sm">
            {t("changeEmail.confirm.successBody")}
          </p>
          <Link
            href="/auth/signin"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {t("changeEmail.confirm.signIn")}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (confirmEmailChangeMutation.isError) {
    const message =
      confirmEmailChangeMutation.error instanceof Error
        ? confirmEmailChangeMutation.error.message
        : undefined
    return (
      <Card className="m-auto w-[400px]">
        <CardHeader>
          <CardTitle>{t("changeEmail.confirm.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <XCircle className="text-destructive h-8 w-8" />
          <p className="text-muted-foreground text-center text-sm">
            {t(mapErrorToKey(message))}
          </p>
          <Link
            href="/auth/profile"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {t("changeEmail.confirm.backToProfile")}
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Pending (confirming) — the default while the mutation runs.
  return (
    <Card className="m-auto w-[400px]">
      <CardHeader>
        <CardTitle className="text-center">
          {t("changeEmail.confirm.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          {t("changeEmail.confirm.loading")}
        </p>
      </CardContent>
    </Card>
  )
}

ConfirmEmailChange.displayName = "ConfirmEmailChange"
