"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useLocale } from "next-intl"

import { removeThisWhenYouNeedMe } from "@/lib/general-helpers"
import { redirect } from "@/lib/navigation"
import { signOutAndClearCache } from "@/lib/sign-out"

export default function SignOutPage() {
  removeThisWhenYouNeedMe("SignOutPage")

  const session = useSession()
  const locale = useLocale()

  useEffect(() => {
    if (session.status === "authenticated") {
      signOutAndClearCache({ callbackUrl: "/" })
    } else {
      redirect({ href: "/", locale })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  return null
}
