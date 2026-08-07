import React from "react"
import { NextIntlClientProvider } from "next-intl"

import type { Preview } from "@storybook/nextjs-vite"

import ar from "../locales/ar.json"
import fr from "../locales/fr.json"

import "../src/styles/globals.css"

/**
 * Components that resolve parameterized labels themselves — `BottomNav`'s badge
 * counts, `EventCard`/`EventDetailPage`'s price line — call `useTranslations`
 * and throw "No intl context found" without a provider. In the app that
 * provider is mounted in the root layout; Storybook renders components in
 * isolation, so it has to supply its own.
 *
 * Messages come from the REAL catalogs (not stubs) so RTL stories keep showing
 * genuine Arabic text, and `timeZone` matches `src/lib/i18n.ts` so date/time
 * formatting is identical to production.
 */
const MESSAGES_BY_DIRECTION = { ltr: fr, rtl: ar } as const
const LOCALE_BY_DIRECTION = { ltr: "fr", rtl: "ar" } as const

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        "tiween-dark": { name: "tiween-dark", value: "#032523" },
        surface: { name: "surface", value: "#0A3533" },
        "surface-light": { name: "surface-light", value: "#0F4542" },
      },
    },
    viewport: {
      options: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "800px" },
        },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const direction: keyof typeof MESSAGES_BY_DIRECTION =
        context.globals.direction === "rtl" ? "rtl" : "ltr"
      return (
        <NextIntlClientProvider
          locale={LOCALE_BY_DIRECTION[direction]}
          messages={MESSAGES_BY_DIRECTION[direction]}
          timeZone="Africa/Tunis"
        >
          <div dir={direction} className="dark font-sans antialiased">
            <Story />
          </div>
        </NextIntlClientProvider>
      )
    },
  ],

  globalTypes: {
    direction: {
      name: "Direction",
      description: "Text direction",
      defaultValue: "ltr",
      toolbar: {
        icon: "globe",
        items: [
          { value: "ltr", title: "LTR" },
          { value: "rtl", title: "RTL" },
        ],
        showName: true,
      },
    },
  },

  initialGlobals: {
    viewport: {
      value: "mobile",
      isRotated: false,
    },

    backgrounds: {
      value: "tiween-dark",
    },
  },
}

export default preview
