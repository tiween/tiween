import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export const request = <T>(
  endpoint: string,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> => {
  return axios({
    ...options,
    method: 'GET',
    url: `${apiUrl}${endpoint}`,
  });
};
