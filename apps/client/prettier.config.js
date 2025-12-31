import globalConfig from "@tiween/prettier-config"

/** @type {import('prettier').Config} */
const config = {
  ...globalConfig,
  plugins: [...globalConfig.plugins, "prettier-plugin-tailwindcss"],
}

export default config
