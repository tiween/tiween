"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"

export interface FooterLabels {
  company: string
  legal: string
  social: string
  aboutUs: string
  careers: string
  press: string
  contact: string
  terms: string
  privacy: string
  cookies: string
  copyright: (year: number) => string
  tagline: string
}

const defaultLabels: FooterLabels = {
  company: "Entreprise",
  legal: "Mentions légales",
  social: "Suivez-nous",
  aboutUs: "À propos",
  careers: "Carrières",
  press: "Presse",
  contact: "Contact",
  terms: "Conditions d'utilisation",
  privacy: "Politique de confidentialité",
  cookies: "Cookies",
  copyright: (year) => `© ${year} Tiween. Tous droits réservés.`,
  tagline: "La plateforme de billetterie culturelle en Tunisie.",
}

export interface FooterProps {
  className?: string
  labels?: FooterLabels
}

/**
 * Footer
 *
 * Desktop footer with links, social icons, and legal information.
 * Hidden on mobile (shown only on lg+).
 */
export function Footer({ className, labels = defaultLabels }: FooterProps) {
  const locale = useLocale()
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className={cn(
        // Only show on desktop
        "hidden lg:block",
        // Background
        "bg-secondary",
        // Border
        "border-border border-t",
        // Padding
        "px-8 py-12",
        className
      )}
    >
      <div className="mx-auto max-w-screen-xl">
        {/* Main footer content */}
        <div className="grid grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-1">
            <Link href={`/${locale}`}>
              <Image
                src="/images/logo.svg"
                alt="Tiween"
                width={100}
                height={28}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-muted-foreground mt-4 text-sm">
              {labels.tagline}
            </p>
          </div>

          {/* Company links */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">
              {labels.company}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.aboutUs}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/careers`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.careers}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/press`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.press}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">
              {labels.legal}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.terms}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cookies`}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {labels.cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social links */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">
              {labels.social}
            </h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com/tiween"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/tiween"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/tiween"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-border mt-12 border-t pt-8">
          <p className="text-muted-foreground text-center text-sm">
            {labels.copyright(currentYear)}
          </p>
        </div>
      </div>
    </footer>
  )
}

Footer.displayName = "Footer"
