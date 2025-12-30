import axios from "axios"

const fetcher = (url: string, params = {}): unknown => {
  let fullUrl = url
  if (url.startsWith("/")) {
    fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${url}`
  }
  return axios.get(fullUrl, { params }).then((res) => res.data)
}

export default fetcher
