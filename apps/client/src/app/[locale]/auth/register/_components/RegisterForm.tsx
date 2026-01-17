"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { PASSWORD_MIN_LENGTH } from "@/lib/constants"
import { Link } from "@/lib/navigation"
import { cn } from "@/lib/styles"
import { useUserMutations } from "@/hooks/useUser"
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
// http://localhost:1337/admin/settings/users-permissions/advanced-settings
const ENABLE_EMAIL_CONFIRMATION = false

export function RegisterForm() {
  const t = useTranslations("auth.register")
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { registerMutation } = useUserMutations()
  const [isAutoLoggingIn, setIsAutoLoggingIn] = React.useState(false)

  // Get callback URL from search params (or default to home)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const form = useForm<z.infer<FormSchemaType>>({
    resolver: zodResolver(RegisterFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  async function onSubmit(values: z.infer<FormSchemaType>) {
    registerMutation.mutate(
      {
        username: values.email,
        email: values.email,
        password: values.password,
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
        <CardContent>
          <AppForm form={form} onSubmit={onSubmit} id={registerFormName}>
            <AppField name="email" type="text" required label={t("email")} />
            <AppField
              name="password"
              type="password"
              required
              label={t("password")}
            />
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
    email: z.string().email(),
    password: z.string().min(PASSWORD_MIN_LENGTH),
    passwordConfirmation: z.string().min(PASSWORD_MIN_LENGTH),
  })
  .superRefine((data, ctx) => {
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
