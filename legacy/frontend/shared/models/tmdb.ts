import axios, { AxiosResponse } from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const TMDB_URLS = {
  SEARCH_MOVIES_BASE_URL: 'https://api.themoviedb.org/3/search/movie',
  MOVIES_BASE_URL: 'https://api.themoviedb.org/3/movie',
  CONFIGURATION_BASE_URL: 'https://api.themoviedb.org/3/configuration',
};
export const fetchMovie = (tmdbid: string): Promise<AxiosResponse> => {
  return axios.get(`${TMDB_URLS.MOVIES_BASE_URL}/${tmdbid}`, {
    params: {
      api_key: TMDB_API_KEY,
      append_to_response: ['videos', 'credits'].join(),
      language: 'fr-FR',
    },
  });
};
