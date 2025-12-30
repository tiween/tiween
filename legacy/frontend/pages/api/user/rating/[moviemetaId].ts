import { NextApiRequest, NextApiResponse } from "next"
import { withSentry } from "@sentry/nextjs"
import axios from "axios"
import { getSession } from "next-auth/react"
import qs from "qs"

import UserRating from "../../../../shared/models/user-rating"

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const session = await getSession({ req })
  if (session?.jwt) {
    const config = {
      headers: { Authorization: `Bearer ${session?.jwt}` },
    }
    const {
      query: { moviemetaId },
    } = req
    const params = qs.stringify({
      user_eq: session.id,
      moviemeta: moviemetaId,
    })

    const { data: userRatings } = await axios.get<UserRating[]>(
      `${process.env.NEXT_PUBLIC_API_URL}/user-ratings?${params}`,
      config
    )
    if (userRatings.length > 0) {
      res.status(200).json(userRatings[0])
    }
  } else {
    res.status(200).json({})
  }
}
export default withSentry(handler)
