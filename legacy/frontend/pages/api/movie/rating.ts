import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"

import { getBackendApiUrl } from "../../../shared/services/utils"

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { method, body } = req

  try {
    const backendApiUrl = getBackendApiUrl()
    switch (method) {
      case "POST": {
        const { token, userId, rating, moviemetaId } = body

        if (token && userId) {
          const payload = {
            moviemeta: moviemetaId,
            rating,
          }
          const results = await axios.post(
            `${backendApiUrl}/user-ratings`,
            { ...payload },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          res.status(200).json(results.data)
        }

        break
      }
    }
  } catch (error) {
    console.error("ERROR", error)
    res.status(400).json(error.message)
  }
}
export default withSentry(handler)
;("")
