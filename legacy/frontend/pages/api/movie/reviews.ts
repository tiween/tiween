import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"
import { getSession } from "next-auth/react"

import { request } from "../../../shared/services/strapi"
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
        const session = await getSession({ req })
        const { review, moviemetaId } = body

        if (session) {
          const payload = {
            authorUser: session.id,
            content: review,
            related: [
              {
                refId: moviemetaId,
                ref: "moviemeta",
                field: "comments",
              },
            ],
          }
          const { data } = await axios.post(
            `${backendApiUrl}/comments/moviemeta:${moviemetaId}`,
            { ...payload },
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          )

          res.status(200).json(data)
        }
        break
      }
      case "GET": {
        const {
          query: { moviemetaId },
        } = req
        const reviews = await request(`/comments/moviemeta:${moviemetaId}/flat`)
        return res.status(200).json(reviews)
        break
      }
      default:
        res.status(405).end()
    }
  } catch (error) {
    console.error("ERROR", error)
    res.status(400).json(error.message)
  }
}

export default withSentry(handler)
