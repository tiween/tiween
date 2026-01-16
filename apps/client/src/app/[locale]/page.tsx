import { Metadata } from "next"

import { ComingBackLanding } from "@/components/landing/ComingBackLanding"

export const metadata: Metadata = {
  title: "Tiween - Coming Soon",
  description:
    "Tiween is coming back. Subscribe to be notified when we launch.",
}

export default function HomePage() {
  return <ComingBackLanding />
}
