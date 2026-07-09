import { use } from "react"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { RegisterForm } from "./_components/RegisterForm"

export default function RegisterPage({
  params,
}: PageProps<"/[locale]/auth/register">) {
  const { locale } = use(params) as { locale: Locale }

  setRequestLocale(locale)

  // Social buttons render only when the provider's OAuth creds are configured
  // server-side (matches the gating in lib/auth.ts).
  const enableGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  const enableFacebook = Boolean(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  )

  return (
    <RegisterForm enableGoogle={enableGoogle} enableFacebook={enableFacebook} />
  )
}
