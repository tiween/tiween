import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { ConfirmEmailChange } from "./_components/ConfirmEmailChange"

interface ChangeEmailPageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Normalize a query param that may be duplicated (array) to its first value. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }
  return value ?? ""
}

export default async function ChangeEmailPage({
  params,
  searchParams,
}: ChangeEmailPageProps) {
  const { locale } = await params
  const query = await searchParams

  setRequestLocale(locale)

  const code = firstParam(query.code)

  return <ConfirmEmailChange code={code} />
}
