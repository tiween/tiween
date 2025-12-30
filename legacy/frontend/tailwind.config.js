module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],

  darkMode: false, // or 'media' or 'class'
  theme: {
    fontSize: {
      "2xs": ".625rem",
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "3.75rem",
      "7xl": "4.5rem",
      "8xl": "6rem",
      "9xl": "8rem",
    },
    minHeight: {
      0: "0",
      "1/4": "25%",
      "1/2": "50%",
      "3/4": "75%",
      full: "100%",
    },
    backgroundSize: {
      auto: "auto",
      cover: "cover",
      contain: "contain",
      "section-title": "100% 5px",
    },
    textShadow: {
      base: "2px 1px 1px  #000",
    },
    container: {
      center: true,
    },

    extend: {
      fontFamily: {
        lato: ["Lato", "sans-serif"],
        fira: ["Fira Sans", "sans-serif"],
        noto: ["Noto Sans Arabic", "sans-serif"],
        baskerville: ["Libre Baskerville", "serif"],
        tajwal: ["Tajawal", "sans-serif"],
      },
      colors: {
        gold: "#FFD600",
        "mulled-wine": "#4A4354",
        manatee: "#938D9F",
        cinder: "#0C0911",
        "wild-strawberry": {
          darkest: "#990049",
          dark: "#FF007A",
          DEFAULT: "#FF479F",
          light: "#FF66AF",
          lightest: "#FFCCE4",
        },
        whatsapp: "#25d366",
        facebook: "#39579a",

        amaranth: "#E2334A",
        bastille: {
          50: "#928f95",
          100: "#7c7980",
          200: "#66626b",
          300: "#504c55",
          400: "#3a3540",
          500: "#241f2b",
          600: "#1d1922",
          700: "#16131a",
          800: "#0e0c11",
          900: "#070609",
          DEFAULT: "#241F2B",
          light: "#3e354a",
          lighter: "#67597b",
          lightest: "#9284a6",
        },
        selago: "#F6F2FC",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#F6F2FC",
            h1: {
              color: "white",
            },
            h2: {
              color: "white",
            },
            h3: {
              color: "white",
            },
          },
        },
      },
    },
  },
  variants: {
    extend: {
      display: ["hover", "focus", "group-hover"],
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-textshadow"),
    require("@tailwindcss/aspect-ratio"),
    require("tw-elements/dist/plugin"),
  ],
  content: [
    "./src/**/*.{html,js}",
    "./node_modules/tw-elements/dist/js/**/*.js",
  ],
}
