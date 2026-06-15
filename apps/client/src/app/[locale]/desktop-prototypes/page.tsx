import { Metadata } from "next"
import Link from "next/link"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

export const metadata: Metadata = {
  title: "Desktop Prototypes | Tiween",
  description: "Preview desktop page prototypes for Tiween",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{
    locale: Locale
  }>
}

export default async function DesktopPrototypesIndex({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const prototypes = [
    {
      name: "Theater Detail Page",
      description:
        "Event detail page with two-column layout, artistic team section, and showtime selector",
      href: `/${locale}/desktop-prototypes/theater-detail`,
      category: "Event Pages",
    },
    {
      name: "Film Detail Page",
      description:
        "Movie detail page with director credits, cast distribution, synopsis, and session selector",
      href: `/${locale}/desktop-prototypes/film-detail`,
      category: "Event Pages",
    },
    {
      name: "My Events",
      description:
        "User's events page with upcoming/past tabs, ticket downloads, and receipt downloads",
      href: `/${locale}/desktop-prototypes/my-events`,
      category: "User Account",
    },
    {
      name: "Ticketing - Session Selection",
      description:
        "Session selection page with date selector, venue cards, and movie info sidebar",
      href: `/${locale}/desktop-prototypes/ticketing`,
      category: "Ticketing Flow",
    },
    {
      name: "Ticketing - Quantity Selection",
      description:
        "Ticket quantity page with tariff options, +/- counters, price summary, and payment methods",
      href: `/${locale}/desktop-prototypes/ticketing-quantity`,
      category: "Ticketing Flow",
    },
    {
      name: "Ticketing - Cart Summary",
      description:
        "Reservation recap with success message, order summary, and payment button",
      href: `/${locale}/desktop-prototypes/ticketing-summary`,
      category: "Ticketing Flow",
    },
    {
      name: "Ticketing - Success",
      description:
        "Payment confirmation page with success message and link to My Events",
      href: `/${locale}/desktop-prototypes/ticketing-success`,
      category: "Ticketing Flow",
    },
  ]

  return (
    <div className="bg-background min-h-screen px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-foreground mb-4 text-4xl">
          Desktop Prototypes
        </h1>
        <p className="text-muted-foreground mb-12 text-lg">
          Preview the new responsive desktop page designs for Tiween. These
          prototypes demonstrate enhanced layouts for larger screens while
          maintaining mobile compatibility.
        </p>

        {/* Group prototypes by category */}
        {["Event Pages", "User Account", "Ticketing Flow"].map((category) => {
          const categoryPrototypes = prototypes.filter(
            (p) => p.category === category
          )
          if (categoryPrototypes.length === 0) return null

          return (
            <div key={category} className="mb-10">
              <h2 className="text-primary mb-4 text-sm font-medium tracking-wider uppercase">
                {category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryPrototypes.map((proto) => (
                  <Link
                    key={proto.href}
                    href={proto.href}
                    className="bg-secondary hover:bg-accent group rounded-xl p-5 transition-all"
                  >
                    <h3 className="text-foreground group-hover:text-primary mb-1 text-lg font-semibold transition-colors">
                      {proto.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {proto.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        <div className="border-border/50 mt-12 rounded-xl border p-6">
          <h3 className="text-foreground mb-4 font-semibold">Design Tokens</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="bg-background border-border/50 mb-2 h-12 w-full rounded-lg border"></div>
              <p className="text-muted-foreground text-xs">Background</p>
              <p className="text-foreground font-mono text-xs">#032523</p>
            </div>
            <div>
              <div className="bg-primary mb-2 h-12 w-full rounded-lg"></div>
              <p className="text-muted-foreground text-xs">Primary</p>
              <p className="text-foreground font-mono text-xs">#F8EB06</p>
            </div>
            <div>
              <div className="bg-secondary mb-2 h-12 w-full rounded-lg"></div>
              <p className="text-muted-foreground text-xs">Secondary</p>
              <p className="text-foreground font-mono text-xs">#0A3533</p>
            </div>
            <div>
              <div className="bg-accent mb-2 h-12 w-full rounded-lg"></div>
              <p className="text-muted-foreground text-xs">Accent</p>
              <p className="text-foreground font-mono text-xs">#0F4542</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
