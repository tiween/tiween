import axiosInstance from "../utils/axiosInstance"

const moviemetaRequests = {
  syncWithTMDB: async (tmdbid, moviemetaId) => {
    return axiosInstance.post(`/tmdb/moviemeta/sync`, { tmdbid, moviemetaId })
  },
}
export default moviemetaRequests
