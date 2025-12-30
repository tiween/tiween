import axiosInstance from "../utils/axiosInstance"

const tmdbSettingsRequests = {
  getSettings: async () => {
    const { data } = await axiosInstance.get(`/tmdb/settings`)

    return data
  },
  setSettings: async (data) => {
    try {
      const results = await axiosInstance.post(`/tmdb/settings`, data)

      return results
    } catch (e) {
      console.error(e)
    }
  },
}
export default tmdbSettingsRequests
