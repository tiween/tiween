import { Inter, Lalezar, Noto_Sans_Arabic } from "next/font/google"

/**
 * Tiween Typography System
 *
 * - Lalezar: Display headings, brand moments (Arabic/Latin)
 * - Inter: Body text, UI elements (Latin)
 * - Noto Sans Arabic: Body text for Arabic content
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

export const fontNotoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-arabic",
  display: "swap",
})

// Legacy export for backward compatibility
export const fontRoboto = fontInter
