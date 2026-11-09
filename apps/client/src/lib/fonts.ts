import { IBM_Plex_Sans_Arabic, Inter, Lalezar } from "next/font/google"

/**
 * Tiween Typography System
 *
 * - Lalezar: Display headings, brand moments (Arabic/Latin)
 * - Inter: Body text, UI elements (Latin)
 * - IBM Plex Sans Arabic: Body text and UI for Arabic content (owner
 *   decision 2026-11-09, replaces Noto Sans Arabic)
 *
 * The `variable` classes are applied on <html> in `app/[locale]/layout.tsx`
 * so the font stacks declared on `:root` (`styles/theme.css`) can resolve them.
 */

export const fontInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
})

export const fontLalezar = Lalezar({
  subsets: ["latin", "arabic"],
  weight: ["400"],
  variable: "--font-lalezar",
  display: "swap",
})

// Arabic subset only: Latin runs inside Arabic copy fall through to Inter.
export const fontPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
})

// Legacy export for backward compatibility
export const fontRoboto = fontInter
