import Image from "next/image"

import { Link } from "@/lib/navigation"

/**
 * The header row that carries the tiween wordmark on the detail error and
 * not-found screens (UI-SPEC A5). The detail page's own header only exists on
 * a successful render, so these screens bring a minimal one: 56px, hairline
 * below, wordmark linking home.
 */
export function ShortsWordmarkHeader() {
  return (
    <header className="border-border flex h-14 items-center border-b px-4 md:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-md">
        <Image
          src="/images/tiween-wordmark-gold.png"
          alt="tiween"
          width={36}
          height={34}
          className="block h-[34px] w-auto"
        />
      </Link>
    </header>
  )
}

ShortsWordmarkHeader.displayName = "ShortsWordmarkHeader"
