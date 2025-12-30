"use strict"

const getPluginStore = () =>
  strapi.store({
    environment: "",
    type: "tmdb",
    name: "settings",
  })
const createDefaultConfig = async () => {
  const pluginStore = getPluginStore()
  const value = {
    disabled: false,
  }
  await pluginStore.set({ key: "api", value })
  return pluginStore.get({ key: "api" })
}
module.exports = {
  async getSettings() {
    const pluginStore = getPluginStore()
    let config = await pluginStore.get({ key: "api" })
    if (!config) {
      config = await createDefaultConfig()
    }
    return config
  },
  async setSettings(settings) {
    const value = settings
    const pluginStore = getPluginStore()
    await pluginStore.set({ key: "api", value })
    return pluginStore.get({ key: "api" })
  },
}
