import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { SignInFormWithSocial } from "./_components/SignInFormWithSocial"

export default async function SignInPage({
  params,
}: PageProps<"/[locale]/auth/signin">) {
  const { locale } = (await params) as { locale: Locale }

  setRequestLocale(locale)

  // Social buttons render only when the provider's OAuth creds are configured
  // server-side (matches the gating in lib/auth.ts). These are server-only env
  // vars, so this presence check must happen in this server component.
  const enableGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  const enableFacebook = Boolean(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  )

  return (
    <SignInFormWithSocial
      enableGoogle={enableGoogle}
      enableFacebook={enableFacebook}
    />
  )
}
