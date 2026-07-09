import { use } from "react"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { ResetPasswordForm } from "./_components/ResetPasswordForm"

/** Normalize a query param that may be duplicated (array) to its first value. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }
  return value ?? ""
}

export default function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/auth/reset-password">) {
  const { locale } = use(params) as { locale: Locale }
  const query = use(searchParams) as Record<
    string,
    string | string[] | undefined
  >

  setRequestLocale(locale)

  const code = firstParam(query.code)
  const email = firstParam(query.email)

  return <ResetPasswordForm code={code} email={email} />
}
