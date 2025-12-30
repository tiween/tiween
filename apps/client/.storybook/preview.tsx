import React from "react"

import type { Preview } from "@storybook/react"

import "../src/styles/globals.css"

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "tiween-dark",
      values: [
        { name: "tiween-dark", value: "#032523" },
        { name: "surface", value: "#0A3533" },
        { name: "surface-light", value: "#0F4542" },
      ],
    },
    viewport: {
      viewports: {
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
      defaultViewport: "mobile",
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
      const direction = context.globals.direction || "ltr"
      return (
        <div dir={direction} className="dark font-sans antialiased">
          <Story />
        </div>
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
}

export default preview
